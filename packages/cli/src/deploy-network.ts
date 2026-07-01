import { SimplePool } from "nostr-tools/pool";
import type { Event as NostrToolsEvent } from "nostr-tools/core";
import { joinPath } from "./path.ts";
import type { NappletSigner } from "./signing.ts";
import type { DeployManifestTemplate, ManifestFileMapping, SignedNostrEvent } from "./types.ts";

const UPLOAD_AUTH_KIND = 24242;
const UPLOAD_AUTH_TTL_SECONDS = 3600;

export interface NetworkDeployConfig {
  relays: string[];
  blossomServers: string[];
}

export interface DeployFilePayload {
  candidateDir: string;
  path: string;
  sha256: string;
  data: Uint8Array;
  contentType: string;
}

export interface ServerUploadResult {
  server: string;
  file: string;
  sha256: string;
  success: boolean;
  skipped: boolean;
  error?: string;
}

export interface RelayPublishResult {
  relay: string;
  eventId: string;
  success: boolean;
  error?: string;
}

export interface NetworkDeployResult {
  uploaded: ServerUploadResult[];
  published: RelayPublishResult[];
}

export interface NetworkDeployOptions {
  fetch?: typeof fetch;
  publish?: RelayPublisher;
  now?: () => number;
}

export type RelayPublisher = (
  relays: string[],
  event: SignedNostrEvent,
) => Promise<RelayPublishResult[]>;

export async function executeNetworkDeploy(
  manifests: readonly DeployManifestTemplate[],
  config: NetworkDeployConfig,
  signer: NappletSigner,
  options: NetworkDeployOptions = {},
): Promise<NetworkDeployResult> {
  if (config.blossomServers.length === 0) {
    throw new Error("Network deploy requires at least one blossom server in .napplet config");
  }
  if (config.relays.length === 0) {
    throw new Error("Network deploy requires at least one relay in .napplet config");
  }
  const events = signedEvents(manifests);
  if (events.length === 0) {
    throw new Error("Network deploy requires at least one signed manifest event");
  }
  const files = await collectDeployFilePayloads(manifests);
  const uploaded = await uploadFilesToServers(files, config.blossomServers, signer, options);
  const failedUploads = uploaded.filter((result) => !result.success);
  if (failedUploads.length > 0) {
    return {
      uploaded,
      published: [],
    };
  }
  const publish = options.publish ?? publishEventWithSimplePool;
  const published: RelayPublishResult[] = [];
  for (const event of events) {
    published.push(...await publish(config.relays, event));
  }
  return { uploaded, published };
}

export function networkDeploySucceeded(
  result: NetworkDeployResult,
  manifests: readonly DeployManifestTemplate[],
): boolean {
  const eventIds = signedEvents(manifests).map((event) => event.id);
  return result.uploaded.every((upload) => upload.success) && eventIds.length > 0 &&
    eventIds.every((eventId) =>
      result.published.some((publish) => publish.eventId === eventId && publish.success)
    );
}

export async function collectDeployFilePayloads(
  manifests: readonly DeployManifestTemplate[],
): Promise<DeployFilePayload[]> {
  const unique = new Map<string, { candidateDir: string; file: ManifestFileMapping }>();
  for (const manifest of manifests) {
    for (const file of manifest.files) {
      const key = `${manifest.item.candidate.dir}\0${file.path}`;
      if (!unique.has(key)) {
        unique.set(key, { candidateDir: manifest.item.candidate.dir, file });
      }
    }
  }
  const payloads: DeployFilePayload[] = [];
  for (const { candidateDir, file } of unique.values()) {
    payloads.push({
      candidateDir,
      path: file.path,
      sha256: file.sha256,
      data: await Deno.readFile(joinPath(candidateDir, file.path.slice(1))),
      contentType: contentTypeForPath(file.path),
    });
  }
  return payloads;
}

export async function uploadFilesToServers(
  files: readonly DeployFilePayload[],
  servers: readonly string[],
  signer: NappletSigner,
  options: Pick<NetworkDeployOptions, "fetch" | "now"> = {},
): Promise<ServerUploadResult[]> {
  const fetcher = options.fetch ?? fetch;
  const authHeader = await createUploadAuthorization(
    signer,
    [...new Set(files.map((file) => file.sha256))],
    options.now,
  );
  const results: ServerUploadResult[] = [];
  for (const server of servers) {
    for (const file of files) {
      results.push(await uploadFileToServer(file, server, authHeader, fetcher));
    }
  }
  return results;
}

export async function createUploadAuthorization(
  signer: NappletSigner,
  blobSha256s: readonly string[],
  now: () => number = () => Math.floor(Date.now() / 1000),
): Promise<string> {
  const createdAt = now();
  const signed = await signer.sign({
    kind: UPLOAD_AUTH_KIND,
    created_at: createdAt,
    tags: [
      ["t", "upload"],
      ...blobSha256s.map((hash) => ["x", hash]),
      ["expiration", String(createdAt + UPLOAD_AUTH_TTL_SECONDS)],
      ["client", "napplet"],
    ],
    content: "Upload blobs via napplet",
  });
  return `Nostr ${btoa(JSON.stringify(signed))}`;
}

export async function publishEventWithSimplePool(
  relays: string[],
  event: SignedNostrEvent,
): Promise<RelayPublishResult[]> {
  const pool = new SimplePool();
  try {
    const settled = await Promise.allSettled(
      pool.publish(relays, event as NostrToolsEvent, { maxWait: 15_000 }),
    );
    return relays.map((relay, index) => {
      const result = settled[index];
      if (result?.status === "fulfilled") {
        return { relay, eventId: event.id, success: true };
      }
      const reason = result?.status === "rejected" ? result.reason : "publish did not run";
      return {
        relay,
        eventId: event.id,
        success: false,
        error: reason instanceof Error ? reason.message : String(reason),
      };
    });
  } finally {
    pool.close(relays);
    pool.destroy();
  }
}

function signedEvents(manifests: readonly DeployManifestTemplate[]): SignedNostrEvent[] {
  return manifests
    .map((manifest) => manifest.signedEvent)
    .filter((event): event is SignedNostrEvent => event !== undefined);
}

async function uploadFileToServer(
  file: DeployFilePayload,
  server: string,
  authHeader: string,
  fetcher: typeof fetch,
): Promise<ServerUploadResult> {
  const base = server.endsWith("/") ? server : `${server}/`;
  const blobUrl = `${base}${file.sha256}`;
  const uploadUrl = `${base}upload`;
  try {
    const preflight = await fetcher(blobUrl, { method: "HEAD" });
    if (preflight.ok) {
      return {
        server,
        file: file.path,
        sha256: file.sha256,
        success: true,
        skipped: true,
      };
    }
    if (preflight.status !== 404) {
      return failure(server, file, `HEAD ${blobUrl} returned HTTP ${preflight.status}`);
    }
  } catch {
    // Fall through to PUT; some Blossom servers do not support unauthenticated HEAD checks.
  }

  const response = await fetcher(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: authHeader,
      "Content-Type": file.contentType,
    },
    body: new Blob([copyBytes(file.data).buffer], { type: file.contentType }),
  });
  if (response.ok) {
    return {
      server,
      file: file.path,
      sha256: file.sha256,
      success: true,
      skipped: false,
    };
  }
  const body = await response.text().catch(() => "");
  return failure(
    server,
    file,
    `PUT ${uploadUrl} returned HTTP ${response.status}${body ? `: ${body}` : ""}`,
  );
}

function failure(server: string, file: DeployFilePayload, error: string): ServerUploadResult {
  return {
    server,
    file: file.path,
    sha256: file.sha256,
    success: false,
    skipped: false,
    error,
  };
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

function contentTypeForPath(path: string): string {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}
