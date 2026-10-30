/** Application-side access to the user's paired circle (NAP-MESH). */
import type {
  EventTemplate, MeshApi, MeshBlobsResult, MeshInfo, MeshPublishOptions,
  MeshPublishResult, MeshSubscribeOptions, MeshSubscription, NostrFilter,
} from '@napplet/core';
import { requireDomain } from './require-napplet.js';

/**
 * Read circle availability and the user's hop caps.
 * @returns Circle status reported by the shell.
 * @example const status = await info();
 */
export function info(): Promise<MeshInfo> { return requireDomain('mesh').info(); }

/**
 * Ask the shell to sign and publish an event to the user's circle.
 * @param template Unsigned event template.
 * @param options Optional circle-hop budget; zero stays on this device.
 * @returns Publish result including the effective budget.
 * @example await publish({ kind: 20666, content: 'ding' }, { ttl: 2 });
 */
export function publish(template: EventTemplate, options?: MeshPublishOptions): Promise<MeshPublishResult> {
  return requireDomain('mesh').publish(template, options);
}

/**
 * Subscribe to matching local and circle events. EOSE ends only local backlog.
 * @param filters NIP-01 filter or filters.
 * @param options Optional backlog circle-hop budget.
 * @returns Subscription with event, eose, and closed deliveries.
 * @example const sub = subscribe({ kinds: [9] }, { ttl: 1 });
 */
export function subscribe(filters: NostrFilter | NostrFilter[], options?: MeshSubscribeOptions): MeshSubscription {
  return requireDomain('mesh').subscribe(filters, options);
}

/**
 * Count reachable circle members holding each blob without downloading it.
 * @param hashes At most 64 hexadecimal SHA-256 hashes.
 * @returns Counts keyed by lowercase hash and the number of members asked.
 * @example const counts = await blobs(['a'.repeat(64)]);
 */
export function blobs(hashes: string[]): Promise<MeshBlobsResult> { return requireDomain('mesh').blobs(hashes); }

/**
 * Circle operations delegated to the currently injected mesh domain.
 * @example import { mesh } from '@napplet/sdk'; const status = await mesh.info();
 */
export const mesh: MeshApi = { info, publish, subscribe, blobs };
export type {
  MeshApi, MeshBlobsResult, MeshInfo, MeshLimits, MeshPublishOptions,
  MeshPublishResult, MeshSubscribeOptions, MeshSubscription,
} from '@napplet/core';
export { meshInfo, meshPublish, meshSubscribe, meshBlobs } from '@napplet/nap/mesh/sdk';
