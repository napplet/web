import { SimplePool } from "nostr-tools/pool";
import type { Event as NostrToolsEvent } from "nostr-tools/core";
import { base64urlnopad } from "@scure/base";
import { contentType } from "@std/media-types";
import { extname } from "@std/path";
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

export interface UploadSummary {
  servers: number;
  serversFullyUploaded: number;
  totalUploads: number;
  failedUploads: number;
}

export interface NetworkDeployResult {
  uploaded: ServerUploadResult[];
  published: RelayPublishResult[];
  uploadSummary: UploadSummary;
}

export type NetworkDeployProgress =
  | { type: "upload:start"; files: number; servers: number; totalUploads: number }
  | {
    type: "upload:result";
    completedUploads: number;
    totalUploads: number;
    result: ServerUploadResult;
  }
  | { type: "upload:complete"; summary: UploadSummary }
  | { type: "publish:start"; events: number; relays: number; totalPublishes: number }
  | {
    type: "publish:event";
    completedEvents: number;
    events: number;
    eventId: string;
    results: RelayPublishResult[];
  }
  | { type: "publish:skipped"; summary: UploadSummary }
  | { type: "publish:complete"; results: RelayPublishResult[] };

export interface NetworkDeployOptions {
  fetch?: typeof fetch;
  publish?: RelayPublisher;
  now?: () => number;
  onProgress?: (progress: NetworkDeployProgress) => void;
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
  options.onProgress?.({
    type: "upload:start",
    files: files.length,
    servers: config.blossomServers.length,
    totalUploads: files.length * config.blossomServers.length,
  });
  const uploaded = await uploadFilesToServers(files, config.blossomServers, signer, options);
  const uploadSummary = summarizeUploads(uploaded, config.blossomServers);
  options.onProgress?.({ type: "upload:complete", summary: uploadSummary });
  if (uploadSummary.failedUploads > 0) {
    // Publish only when every server holds every blob, so each manifest `server` tag
    // is a real mirror. Report how far we got so operators can tell a single failed
    // mirror apart from a total upload failure.
    console.error(
      `[deploy] skipping relay publish: ${uploadSummary.serversFullyUploaded}/` +
        `${uploadSummary.servers} servers fully uploaded ` +
        `(${uploadSummary.failedUploads}/${uploadSummary.totalUploads} uploads failed).`,
    );
    for (const failed of uploaded.filter((result) => !result.success)) {
      console.error(`[deploy]   ${failed.server} ${failed.file}: ${failed.error ?? "failed"}`);
    }
    options.onProgress?.({ type: "publish:skipped", summary: uploadSummary });
    return {
      uploaded,
      published: [],
      uploadSummary,
    };
  }
  const publish = options.publish ?? publishEventWithSimplePool;
  const published: RelayPublishResult[] = [];
  options.onProgress?.({
    type: "publish:start",
    events: events.length,
    relays: config.relays.length,
    totalPublishes: events.length * config.relays.length,
  });
  let completedEvents = 0;
  for (const event of events) {
    const results = await publish(config.relays, event);
    completedEvents += 1;
    published.push(...results);
    options.onProgress?.({
      type: "publish:event",
      completedEvents,
      events: events.length,
      eventId: event.id,
      results,
    });
  }
  options.onProgress?.({ type: "publish:complete", results: published });
  return { uploaded, published, uploadSummary };
}

function summarizeUploads(
  uploaded: readonly ServerUploadResult[],
  servers: readonly string[],
): UploadSummary {
  const failedUploads = uploaded.filter((result) => !result.success).length;
  const serversFullyUploaded =
    servers.filter((server) =>
      uploaded.some((result) => result.server === server) &&
      uploaded.every((result) => result.server !== server || result.success)
    ).length;
  return {
    servers: servers.length,
    serversFullyUploaded,
    totalUploads: uploaded.length,
    failedUploads,
  };
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
  options: Pick<NetworkDeployOptions, "fetch" | "now" | "onProgress"> = {},
): Promise<ServerUploadResult[]> {
  const fetcher = options.fetch ?? fetch;
  const blobSha256s = [...new Set(files.map((file) => file.sha256))];
  const results: ServerUploadResult[] = [];
  const totalUploads = files.length * servers.length;
  for (const server of servers) {
    // BUD-11: scope each token to the target server so a leaked header cannot be
    // replayed against other Blossom servers before it expires.
    const authHeader = await createUploadAuthorization(
      signer,
      blobSha256s,
      options.now,
      serverHost(server),
    );
    for (const file of files) {
      const result = await uploadFileToServer(file, server, authHeader, fetcher);
      results.push(result);
      options.onProgress?.({
        type: "upload:result",
        completedUploads: results.length,
        totalUploads,
        result,
      });
    }
  }
  return results;
}

export async function createUploadAuthorization(
  signer: NappletSigner,
  blobSha256s: readonly string[],
  now: () => number = () => Math.floor(Date.now() / 1000),
  server?: string,
): Promise<string> {
  const createdAt = now();
  const tags: string[][] = [
    ["t", "upload"],
    ...blobSha256s.map((hash) => ["x", hash]),
    ["expiration", String(createdAt + UPLOAD_AUTH_TTL_SECONDS)],
    ["client", "napplet"],
  ];
  if (server) tags.push(["server", server]);
  const signed = await signer.sign({
    kind: UPLOAD_AUTH_KIND,
    created_at: createdAt,
    tags,
    content: "Upload blobs via napplet",
  });
  // BUD-11: the Nostr auth scheme uses base64url without padding ("mirroring JWT").
  return `Nostr ${base64urlnopad.encode(new TextEncoder().encode(JSON.stringify(signed)))}`;
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
    // BUD-01 makes HEAD /<sha256> a SHOULD, so only a positive hit lets us skip the
    // upload; any other status (or a thrown error) falls through to PUT.
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
  } catch {
    // Fall through to PUT; some Blossom servers do not support unauthenticated HEAD checks.
  }

  const response = await fetcher(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: authHeader,
      "Content-Type": file.contentType,
      // BUD-02: lets the server reject a mismatched body early (409) before storing it.
      "X-SHA-256": file.sha256,
    },
    body: new Blob([copyBytes(file.data).buffer], { type: file.contentType }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return failure(
      server,
      file,
      `PUT ${uploadUrl} returned HTTP ${response.status}${body ? `: ${body}` : ""}`,
    );
  }

  // BUD-02: a 200/201 upload returns a blob descriptor; confirm the server stored the
  // exact blob we asked for before treating the upload as successful.
  const descriptorError = await verifyBlobDescriptor(response, file.sha256);
  if (descriptorError) return failure(server, file, `PUT ${uploadUrl} ${descriptorError}`);
  return {
    server,
    file: file.path,
    sha256: file.sha256,
    success: true,
    skipped: false,
  };
}

async function verifyBlobDescriptor(
  response: Response,
  expectedSha256: string,
): Promise<string | undefined> {
  let descriptor: unknown;
  try {
    descriptor = await response.json();
  } catch {
    return "returned an unparseable blob descriptor";
  }
  if (typeof descriptor !== "object" || descriptor === null) {
    return "returned an invalid blob descriptor";
  }
  const sha256 = (descriptor as { sha256?: unknown }).sha256;
  if (typeof sha256 !== "string") return "blob descriptor is missing a sha256";
  if (sha256.toLowerCase() !== expectedSha256) {
    return `stored sha256 ${sha256} does not match expected ${expectedSha256}`;
  }
  return undefined;
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
  const extension = extname(path);
  const type = extension ? contentType(extension) : undefined;
  if (type) return type;
  console.warn(
    `[deploy] no known content type for "${path}"; uploading as application/octet-stream`,
  );
  return "application/octet-stream";
}

function serverHost(server: string): string {
  try {
    return new URL(server).host.toLowerCase();
  } catch {
    // Fall back to the raw value; config validation is responsible for URL shape.
    return server.toLowerCase();
  }
}
