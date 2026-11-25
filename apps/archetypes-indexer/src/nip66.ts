// ─── NIP-66 relay discovery ─────────────────────────────────────────────────
// Relay monitors publish one addressable kind 30166 event per relay they check;
// its `d` tag is the relay URL. Only recent events count as evidence the relay exists.

import type { Event } from 'nostr-tools/pure';
import { pageRelay, type Query } from './relay-client.ts';
import { normalizeRelayUrl } from './relay-url.ts';

/** NIP-66 relay discovery event kind. */
export const RELAY_DISCOVERY_KIND = 30166;

export interface DiscoveryOptions {
  now: number;
  lookbackDays: number;
  pageLimit: number;
  maxEvents: number;
  allowPrivateHosts: boolean;
}

export interface DiscoveryResult {
  /** Canonical relay URL → newest evidence time. */
  relays: Map<string, number>;
  /** Monitor relays that answered completely. */
  answered: string[];
}

/**
 * Extract canonical relay URLs from discovery events, keeping the newest evidence per relay.
 * @param events Verified kind 30166 events.
 * @param allowPrivateHosts Whether private relays are acceptable.
 * @returns URL → newest `created_at`.
 * @example relaysFromDiscovery(events, false)
 */
export function relaysFromDiscovery(events: Event[], allowPrivateHosts: boolean): Map<string, number> {
  const relays = new Map<string, number>();
  for (const event of events) {
    if (event.kind !== RELAY_DISCOVERY_KIND) continue;
    const d = event.tags.find(tag => tag[0] === 'd')?.[1];
    const url = normalizeRelayUrl(d, { allowPrivateHosts });
    if (!url) continue;
    relays.set(url, Math.max(relays.get(url) ?? 0, event.created_at));
  }
  return relays;
}

/**
 * Ask every monitor relay for recent discovery events and merge the relays they list.
 * @param query Injected single-request function.
 * @param monitors Monitor relay URLs.
 * @param options Lookback, paging and host policy.
 * @returns Discovered relays and which monitors answered.
 * @example await discoverRelays(query, ['wss://relay.nostr.watch'], { now, lookbackDays: 7, pageLimit: 500, maxEvents: 20000, allowPrivateHosts: false })
 */
export async function discoverRelays(query: Query, monitors: string[], options: DiscoveryOptions): Promise<DiscoveryResult> {
  const since = options.now - Math.round(options.lookbackDays * 86_400);
  const pages = await Promise.all(monitors.map(async monitor => ({
    monitor,
    page: await pageRelay(query, monitor, { kinds: [RELAY_DISCOVERY_KIND], since }, options.pageLimit, options.maxEvents),
  })));
  const relays = new Map<string, number>();
  for (const { page } of pages) {
    for (const [url, seenAt] of relaysFromDiscovery(page.events, options.allowPrivateHosts)) {
      relays.set(url, Math.max(relays.get(url) ?? 0, seenAt));
    }
  }
  return { relays, answered: pages.filter(({ page }) => page.ok).map(({ monitor }) => monitor) };
}
