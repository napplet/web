import type { Event } from 'nostr-tools/pure';
import type { Config } from './config.ts';
import { runtimeRelays, type RelayState } from './schedule.ts';
import type { EventStore } from './store.ts';
import { dedupeRelays } from './relay-url.ts';

export interface SnapshotRelay {
  url: string;
  points: number;
  source: RelayState['source'];
  lastCheckAt?: number;
  nextCheckAt: number;
}

export interface Snapshot {
  version: 1;
  /** Unix seconds; the browser asks relays only for events newer than this. */
  generatedAt: number;
  siteUrl: string;
  events: Event[];
  /** Event id → up to three relays that served it. */
  relayHints: Record<string, string[]>;
  runtime: { relays: string[]; timeoutMs: number };
  relays: SnapshotRelay[];
  stats: { tracked: number; withNapplets: number; removed: number };
}

const HINTS_PER_EVENT = 3;

/**
 * Assemble the snapshot the site build consumes.
 * @param store Event store.
 * @param config Configuration.
 * @param now Unix seconds.
 * @returns A JSON-serialisable snapshot.
 * @example writeFileSync(path, JSON.stringify(buildSnapshot(store, config, now)))
 */
export function buildSnapshot(store: EventStore, config: Config, now: number): Snapshot {
  const states = [...store.relays().values()];
  const live = states.filter(state => state.removedAt === undefined);
  const scoreOf = new Map(states.map(state => [state.url, state.points]));
  const relayHints: Record<string, string[]> = {};
  for (const [id, relays] of store.sightingsByEvent()) {
    relayHints[id] = [...relays].sort((a, b) => (scoreOf.get(b) ?? 0) - (scoreOf.get(a) ?? 0) || a.localeCompare(b)).slice(0, HINTS_PER_EVENT);
  }
  const pinned = dedupeRelays(config.build.runtimePinnedRelays, { allowPrivateHosts: config.crawl.allowPrivateHosts });
  return {
    version: 1,
    generatedAt: now,
    siteUrl: config.build.siteUrl,
    events: store.allEvents(),
    relayHints,
    runtime: { relays: runtimeRelays(live, config.build.runtimeTopRelays, pinned), timeoutMs: config.build.runtimeTimeoutMs },
    relays: live
      .filter(state => state.points > 0)
      .sort((a, b) => b.points - a.points || a.url.localeCompare(b.url))
      .map(state => ({ url: state.url, points: state.points, source: state.source, ...(state.lastCheckAt ? { lastCheckAt: state.lastCheckAt } : {}), nextCheckAt: state.nextCheckAt })),
    stats: {
      tracked: live.length,
      withNapplets: live.filter(state => state.points > 0).length,
      removed: states.length - live.length,
    },
  };
}
