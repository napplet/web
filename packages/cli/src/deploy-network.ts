import { SimplePool } from "nostr-tools/pool";
import type { Event as NostrToolsEvent } from "nostr-tools/core";
import { collectDeployFilePayloads, uploadFilesToServers } from "./blossom-upload.ts";
import type { ServerUploadResult, UploadResultProgress } from "./blossom-upload.ts";
import type { NappletSigner } from "./signing.ts";
import type { DeployManifestTemplate, SignedNostrEvent } from "./types.ts";

export {
  collectDeployFilePayloads,
  createUploadAuthorization,
  uploadFilesToServers,
} from "./blossom-upload.ts";
export type { DeployFilePayload, ServerUploadResult } from "./blossom-upload.ts";

export interface NetworkDeployConfig {
  relays: string[];
  blossomServers: string[];
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
  | UploadResultProgress
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
  if (uploadSummary.serversFullyUploaded === 0) {
    // Publish only when at least one server holds every blob referenced by the
    // manifests. Individual mirror failures reduce redundancy but do not make the
    // deployed files unavailable.
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
  return result.uploadSummary.serversFullyUploaded > 0 && eventIds.length > 0 &&
    eventIds.every((eventId) =>
      result.published.some((publish) => publish.eventId === eventId && publish.success)
    );
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
