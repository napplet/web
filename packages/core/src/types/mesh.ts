/** NAP-MESH circle operations. See https://github.com/napplet/naps/pull/122. */
import type { EventTemplate, NostrEvent, NostrFilter, RelayEventResult } from './nostr.js';

/** User-controlled maximum circle hops for writes and backlog requests. */
export interface MeshLimits {
  publishTtl: number;
  subscribeTtl: number;
}

/** Current circle availability; offline is a successful result. */
export interface MeshInfo {
  online: boolean;
  peers: number;
  limits: MeshLimits;
}

/** Publish reach. Omission uses the user's cap; zero stays on this device. */
export interface MeshPublishOptions {
  ttl?: number;
}

/** Shell-signing and circle-publication outcome. */
export interface MeshPublishResult {
  ok: boolean;
  event?: NostrEvent;
  eventId?: string;
  ttl?: number;
  error?: string;
}

/** Backlog reach. Omission uses the user's cap; zero asks no members. */
export interface MeshSubscribeOptions {
  ttl?: number;
}

/** Counts of reachable members holding each requested lowercase-hex hash. */
export interface MeshBlobsResult {
  peers: number;
  blobs: Record<string, number>;
}

/** Live circle subscription; eose ends only this device's backlog. */
export interface MeshSubscription {
  on(event: 'event', callback: (result: RelayEventResult) => void): void;
  on(event: 'eose', callback: (ttl: number) => void): void;
  on(event: 'closed', callback: (reason?: string) => void): void;
  close(): void;
}

/** Runtime-provided circle access; signing, pairing and forwarding stay in the shell. */
export interface MeshApi {
  /**
   * Read circle availability and the user's hop caps.
   * @returns Circle information; rejects if it cannot be queried.
   * @example const status = await mesh.info();
   */
  info(): Promise<MeshInfo>;
  /**
   * Ask the shell to sign, retain and distribute an event.
   * @param template Unsigned event content.
   * @param options Optional circle-hop budget, from 0 through 255.
   * @returns Publish outcome, including the effective hop budget.
   * @example await mesh.publish({ kind: 20666, content: 'ding' }, { ttl: 2 });
   */
  publish(template: EventTemplate, options?: MeshPublishOptions): Promise<MeshPublishResult>;
  /**
   * Observe local and circle events, including backlog.
   * @param filters One or more NIP-01 filters.
   * @param options Optional circle-hop budget for backlog.
   * @returns Live subscription with event, eose and closed deliveries.
   * @example const sub = mesh.subscribe({ kinds: [9] }, { ttl: 1 });
   */
  subscribe(filters: NostrFilter | NostrFilter[], options?: MeshSubscribeOptions): MeshSubscription;
  /**
   * Ask reachable circle members which blobs they hold without downloading them.
   * @param hashes Up to 64 SHA-256 hex hashes.
   * @returns Member counts; rejects if the shell cannot ask.
   * @example const counts = await mesh.blobs([artifactHash]);
   */
  blobs(hashes: string[]): Promise<MeshBlobsResult>;
}
