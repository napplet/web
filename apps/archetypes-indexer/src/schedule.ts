/** Relay scoring: points per napplet served; zero-point relays back off along `backoffHours`; unreachable relays are removed. */

export type RelaySource = 'seed' | 'nip66';

export interface RelayState {
  url: string;
  source: RelaySource;
  points: number;
  /** Consecutive reachable checks that found no napplets while the relay had zero points. */
  zeroStreak: number;
  /** Consecutive checks that could not connect. */
  failures: number;
  nextCheckAt: number;
  discoveredAt: number;
  lastCheckAt?: number;
  /** Start time of the last crawl that completed, used for incremental `since`. */
  lastOkAt?: number;
  /** Newest monitor evidence (NIP-66 `created_at`) that the relay exists. */
  lastSeenAt?: number;
  removedAt?: number;
  lastError?: string;
}

export interface CrawlOutcome {
  at: number;
  connected: boolean;
  ok: boolean;
  /** Distinct napplet manifests this relay has served, counting earlier crawls. */
  totalNapplets: number;
  error?: string;
}

export interface ScheduleConfig {
  backoffHours: number[];
  offlineAfterFailures: number;
  pointsPerNapplet: number;
}

const HOUR = 3600;

/**
 * Seconds to wait before the next check after `streak` consecutive zero-point checks.
 * @param streak Consecutive zero-point checks (0 = normal cadence).
 * @param ladder Backoff ladder in hours.
 * @returns Delay in seconds; the ladder's last step repeats.
 * @example backoffSeconds(1, [24, 72]) // 259200
 */
export function backoffSeconds(streak: number, ladder: number[]): number {
  return ladder[Math.min(Math.max(streak, 0), ladder.length - 1)] * HOUR;
}

/**
 * Create the state for a newly known relay, due immediately.
 * @param url Canonical relay URL.
 * @param source Where it came from.
 * @param now Unix seconds.
 * @param seenAt Monitor evidence time, when discovered via NIP-66.
 * @returns A fresh relay state.
 * @example newRelay('wss://relay.example', 'nip66', 1700000000)
 */
export function newRelay(url: string, source: RelaySource, now: number, seenAt?: number): RelayState {
  return { url, source, points: 0, zeroStreak: 0, failures: 0, nextCheckAt: now, discoveredAt: now, ...(seenAt ? { lastSeenAt: seenAt } : {}) };
}

/**
 * Apply one crawl's result to a relay's score, backoff and liveness.
 * @param state Current state.
 * @param outcome What the crawl found.
 * @param config Ladder, failure threshold and points per napplet.
 * @returns The next state; `removedAt` is set when the relay is dropped as offline.
 * @example applyCrawl(state, { at: now, connected: true, ok: true, totalNapplets: 3 }, config)
 */
export function applyCrawl(state: RelayState, outcome: CrawlOutcome, config: ScheduleConfig): RelayState {
  const next: RelayState = { ...state, lastCheckAt: outcome.at };
  if (outcome.error) next.lastError = outcome.error; else delete next.lastError;
  if (!outcome.connected) {
    next.failures = state.failures + 1;
    if (next.failures >= config.offlineAfterFailures && state.source !== 'seed') {
      next.removedAt = outcome.at;
      return next;
    }
    // Unreachable relays are retried on the normal cadence until they cross the threshold;
    // a seed that stays unreachable backs off like an empty relay.
    const streak = state.source === 'seed' && next.failures >= config.offlineAfterFailures ? next.failures - config.offlineAfterFailures + 1 : 0;
    next.nextCheckAt = outcome.at + backoffSeconds(streak, config.backoffHours);
    return next;
  }
  next.failures = 0;
  if (outcome.ok) next.lastOkAt = outcome.at;
  next.points = Math.max(state.points, outcome.totalNapplets * config.pointsPerNapplet);
  // Zero points backs off whether the relay answered completely or not (auth-required, slow):
  // either way it has not served a napplet.
  next.zeroStreak = next.points > 0 ? 0 : state.zeroStreak + 1;
  next.nextCheckAt = outcome.at + backoffSeconds(next.zeroStreak, config.backoffHours);
  return next;
}

/**
 * Fold monitor-reported relays into the known set.
 * New relays are added and due now; removed relays return only on evidence newer than their removal.
 * @param states Known relays by URL (not mutated).
 * @param discovered Canonical URL → newest monitor evidence time.
 * @param now Unix seconds.
 * @returns Updated relays by URL.
 * @example mergeDiscovery(states, new Map([['wss://relay.example', 1700000000]]), now)
 */
export function mergeDiscovery(states: Map<string, RelayState>, discovered: Map<string, number>, now: number): Map<string, RelayState> {
  const out = new Map(states);
  for (const [url, seenAt] of discovered) {
    const current = out.get(url);
    if (!current) {
      out.set(url, newRelay(url, 'nip66', now, seenAt));
      continue;
    }
    const updated: RelayState = { ...current, lastSeenAt: Math.max(current.lastSeenAt ?? 0, seenAt) };
    if (current.removedAt !== undefined && seenAt > current.removedAt) {
      delete updated.removedAt;
      updated.failures = 0;
      updated.nextCheckAt = now;
    }
    out.set(url, updated);
  }
  return out;
}

/**
 * Relays whose next check is due, highest score first, then longest overdue.
 * @param states All known relays.
 * @param now Unix seconds.
 * @returns Due relays.
 * @example dueRelays([...states.values()], now)
 */
export function dueRelays(states: Iterable<RelayState>, now: number): RelayState[] {
  return [...states]
    .filter(state => state.removedAt === undefined && state.nextCheckAt <= now)
    .sort((a, b) => b.points - a.points || a.nextCheckAt - b.nextCheckAt || a.url.localeCompare(b.url));
}

/**
 * The relays handed to browsers for live top-up: the best-scored reachable ones plus pinned relays.
 * @param states All known relays.
 * @param top How many scored relays to take.
 * @param pinned Relays always included (already canonical).
 * @returns Unique relay URLs, pinned first.
 * @example runtimeRelays(states, 6, ['wss://relay.example'])
 */
export function runtimeRelays(states: Iterable<RelayState>, top: number, pinned: string[]): string[] {
  const scored = [...states]
    .filter(state => state.removedAt === undefined && state.failures === 0 && state.points > 0)
    .sort((a, b) => b.points - a.points || a.url.localeCompare(b.url))
    .slice(0, top)
    .map(state => state.url);
  return [...new Set([...pinned, ...scored])];
}
