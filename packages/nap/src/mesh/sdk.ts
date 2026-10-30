/** Application-side NAP-MESH helpers; the runtime injects circle access. */
import type {
  EventTemplate, NostrFilter, NappletGlobal, MeshInfo, MeshPublishOptions,
  MeshPublishResult, MeshSubscribeOptions, MeshSubscription, MeshBlobsResult,
} from '@napplet/core';

function requireMesh(): NonNullable<NappletGlobal['mesh']> {
  const napplet = (window as Window & { napplet?: NappletGlobal }).napplet;
  if (!napplet?.mesh) throw new Error('window.napplet.mesh is unavailable -- runtime did not inject this domain');
  return napplet.mesh;
}

/**
 * Read circle status and user hop caps.
 * @returns Circle information.
 * @example const status = await meshInfo();
 */
export function meshInfo(): Promise<MeshInfo> { return requireMesh().info(); }

/**
 * Publish an unsigned event through the user's circle.
 * @param template Event content for shell signing.
 * @param options Optional circle-hop budget.
 * @returns Shell publication outcome.
 * @example await meshPublish({ kind: 20666, content: 'ding' }, { ttl: 2 });
 */
export function meshPublish(template: EventTemplate, options?: MeshPublishOptions): Promise<MeshPublishResult> {
  return requireMesh().publish(template, options);
}

/**
 * Observe local and circle events.
 * @param filters One or more NIP-01 filters.
 * @param options Optional backlog hop budget.
 * @returns Live subscription; eose marks only local backlog completion.
 * @example const sub = meshSubscribe({ kinds: [9] }, { ttl: 1 });
 */
export function meshSubscribe(filters: NostrFilter | NostrFilter[], options?: MeshSubscribeOptions): MeshSubscription {
  return requireMesh().subscribe(filters, options);
}

/**
 * Ask reachable members which requested blobs they hold.
 * @param hashes Up to 64 SHA-256 hex hashes.
 * @returns Counts per hash without downloading blob bodies.
 * @example const counts = await meshBlobs([artifactHash]);
 */
export function meshBlobs(hashes: string[]): Promise<MeshBlobsResult> { return requireMesh().blobs(hashes); }

export { meshInfo as info, meshPublish as publish, meshSubscribe as subscribe, meshBlobs as blobs };
