import type { Config } from './config.ts';
import { discoverRelays } from './nip66.ts';
import { pageRelay, type Query } from './relay-client.ts';
import { dedupeRelays } from './relay-url.ts';
import { applyCrawl, dueRelays, mergeDiscovery, newRelay, type RelayState } from './schedule.ts';
import { MANIFEST_KINDS, type EventStore } from './store.ts';

export type Log = (message: string, fields?: Record<string, unknown>) => void;

/**
 * Run `worker` over `items` with at most `limit` in flight.
 * @param items Inputs.
 * @param limit Concurrency.
 * @param worker Async task.
 * @returns Results in input order.
 * @example await pool([1, 2, 3], 2, async n => n * 2)
 */
export async function pool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length });
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

/**
 * Make sure configured seed relays are tracked and marked as seeds.
 * @param states Known relays.
 * @param config Configuration.
 * @param now Unix seconds.
 * @returns Updated relays.
 * @example ensureSeeds(store.relays(), config, now)
 */
export function ensureSeeds(states: Map<string, RelayState>, config: Config, now: number): Map<string, RelayState> {
  const out = new Map(states);
  for (const url of dedupeRelays(config.discovery.seedRelays, { allowPrivateHosts: config.crawl.allowPrivateHosts })) {
    const current = out.get(url);
    if (!current) out.set(url, newRelay(url, 'seed', now));
    else if (current.source !== 'seed') {
      const promoted: RelayState = { ...current, source: 'seed' };
      delete promoted.removedAt;
      out.set(url, promoted);
    }
  }
  return out;
}

/**
 * Refresh the relay set from NIP-66 monitors and configured seeds.
 * @param store Event store.
 * @param query Relay query function.
 * @param config Configuration.
 * @param now Unix seconds.
 * @param log Logger.
 * @returns Number of relays now tracked (not removed).
 * @example await runDiscovery(store, query, config, now, log)
 */
export async function runDiscovery(store: EventStore, query: Query, config: Config, now: number, log: Log): Promise<number> {
  let states = ensureSeeds(store.relays(), config, now);
  const monitors = dedupeRelays(config.discovery.monitorRelays, { allowPrivateHosts: config.crawl.allowPrivateHosts });
  if (monitors.length) {
    const result = await discoverRelays(query, monitors, {
      now,
      lookbackDays: config.discovery.lookbackDays,
      pageLimit: config.discovery.pageLimit,
      maxEvents: config.discovery.maxEvents,
      allowPrivateHosts: config.crawl.allowPrivateHosts,
    });
    log('discovery', { monitors: monitors.length, answered: result.answered.length, relays: result.relays.size });
    states = mergeDiscovery(states, result.relays, now);
  }
  store.saveRelays(states.values());
  store.setMeta('lastDiscoveryAt', String(now));
  return [...states.values()].filter(state => state.removedAt === undefined).length;
}

/**
 * Crawl one relay for napplet manifests and update its score and schedule.
 * @param state Relay to crawl.
 * @param store Event store.
 * @param query Relay query function.
 * @param config Configuration.
 * @param now Unix seconds.
 * @returns The relay's next state and how many manifests were new to the store.
 * @example await crawlRelay(state, store, query, config, now)
 */
export async function crawlRelay(state: RelayState, store: EventStore, query: Query, config: Config, now: number): Promise<{ state: RelayState; fresh: number }> {
  const incremental = state.points > 0 && state.lastOkAt !== undefined;
  const since = incremental ? Math.max(0, (state.lastOkAt as number) - config.crawl.overlapHours * 3600) : undefined;
  const page = await pageRelay(query, state.url, { kinds: [...MANIFEST_KINDS], ...(since !== undefined ? { since } : {}) }, config.crawl.pageLimit, config.crawl.maxEventsPerRelay);
  const fresh = page.events.length ? store.putEvents(page.events, state.url, now) : 0;
  const next = applyCrawl(state, {
    at: now,
    connected: page.connected,
    ok: page.ok,
    totalNapplets: store.nappletsOn(state.url),
    ...(page.error ? { error: page.error } : {}),
  }, config.crawl);
  store.saveRelay(next);
  return { state: next, fresh };
}

/**
 * When every relay in a large enough batch failed to connect, the problem is our network (or proxy),
 * not the relays: put their states back so an outage cannot remove the whole relay set.
 * @param before Relay states before the batch.
 * @param results Batch results.
 * @param store Event store.
 * @param config Configuration.
 * @param log Logger.
 * @returns True when the batch was treated as an outage.
 * @example undoOutage(due, results, store, config, log)
 */
export function undoOutage(before: RelayState[], results: Array<{ state: RelayState }>, store: EventStore, config: Config, log: Log): boolean {
  if (before.length < config.crawl.outageMinRelays || results.some(result => result.state.failures === 0)) return false;
  store.saveRelays(before);
  log('outage', { relays: before.length, reason: 'no relay accepted a connection; relay states left unchanged' });
  return true;
}

/**
 * Crawl every relay that has served napplets, due or not, so a build includes everything published up to it.
 * @param store Event store.
 * @param query Relay query function.
 * @param config Configuration.
 * @param now Unix seconds.
 * @param log Logger.
 * @returns Totals for the pass.
 * @example await crawlScored(store, query, config, now, log)
 */
export async function crawlScored(store: EventStore, query: Query, config: Config, now: number, log: Log): Promise<{ crawled: number; fresh: number }> {
  const scored = [...store.relays().values()].filter(state => state.removedAt === undefined && state.points > 0);
  const results = await pool(scored, config.crawl.concurrency, state => crawlRelay(state, store, query, config, now));
  if (undoOutage(scored, results, store, config, log)) throw new Error('network outage: no scored relay accepted a connection');
  const fresh = results.reduce((sum, result) => sum + result.fresh, 0);
  log('pre-build-crawl', { crawled: scored.length, fresh });
  return { crawled: scored.length, fresh };
}

/**
 * Crawl every relay that is due, a bounded number at a time.
 * @param store Event store.
 * @param query Relay query function.
 * @param config Configuration.
 * @param now Unix seconds.
 * @param log Logger.
 * @returns Totals for the cycle.
 * @example await crawlDue(store, query, config, now, log)
 */
export async function crawlDue(store: EventStore, query: Query, config: Config, now: number, log: Log): Promise<{ crawled: number; fresh: number; removed: number }> {
  const due = dueRelays(store.relays().values(), now);
  if (!due.length) return { crawled: 0, fresh: 0, removed: 0 };
  const results = await pool(due, config.crawl.concurrency, state => crawlRelay(state, store, query, config, now));
  if (undoOutage(due, results, store, config, log)) return { crawled: 0, fresh: 0, removed: 0 };
  const fresh = results.reduce((sum, result) => sum + result.fresh, 0);
  const removed = results.filter(result => result.state.removedAt !== undefined).length;
  log('crawl', { crawled: due.length, fresh, removed, stored: store.eventCount() });
  return { crawled: due.length, fresh, removed };
}
