// ─── Long-running service ───────────────────────────────────────────────────
// One loop: discovery when due, crawl due relays, build when the daily slot passes.
// A tiny HTTP server reports health and relay state to operators.

import { createServer, type Server } from 'node:http';
import type { Config, Secrets } from './config.ts';
import { crawlDue, runDiscovery, type Log } from './crawl.ts';
import { buildDue, runBuild } from './build.ts';
import type { Query } from './relay-client.ts';
import type { EventStore } from './store.ts';

export interface ServiceDeps {
  store: EventStore;
  query: Query;
  config: Config;
  secrets: Secrets;
  log: Log;
  now?: () => number;
  /** Replaces the real build, for tests. */
  build?: typeof runBuild;
}

export interface TickResult { discovered: boolean; crawled: number; built: boolean; error?: string }

const metaNumber = (store: EventStore, key: string) => {
  const value = store.getMeta(key);
  return value === undefined ? undefined : Number(value);
};

/**
 * Run one service iteration.
 * @param deps Store, query, config and clock.
 * @returns What the iteration did.
 * @example await tick(deps)
 */
export async function tick(deps: ServiceDeps): Promise<TickResult> {
  const now = (deps.now ?? (() => Math.floor(Date.now() / 1000)))();
  const { store, config } = deps;
  const result: TickResult = { discovered: false, crawled: 0, built: false };
  try {
    const lastDiscovery = metaNumber(store, 'lastDiscoveryAt');
    if (lastDiscovery === undefined || now - lastDiscovery >= config.discovery.intervalHours * 3600) {
      await runDiscovery(store, deps.query, config, now, deps.log);
      result.discovered = true;
    }
    result.crawled = (await crawlDue(store, deps.query, config, now, deps.log)).crawled;
    if (config.build.enabled && buildDue(now, config.build.at, metaNumber(store, 'lastBuildAt'), config.build.buildOnStart)) {
      await (deps.build ?? runBuild)(store, config, deps.secrets, now, deps.log);
      result.built = true;
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    store.setMeta('lastError', `${now} ${result.error}`);
    deps.log('error', { error: result.error });
  }
  store.setMeta('lastTickAt', String(now));
  return result;
}

/**
 * Operator status: counts, timings and the scored relay table. No secrets.
 * @param store Event store.
 * @returns JSON-serialisable status.
 * @example status(store)
 */
export function status(store: EventStore): Record<string, unknown> {
  const relays = [...store.relays().values()];
  const live = relays.filter(relay => relay.removedAt === undefined);
  return {
    events: store.eventCount(),
    relays: { tracked: live.length, withNapplets: live.filter(relay => relay.points > 0).length, removed: relays.length - live.length },
    lastDiscoveryAt: metaNumber(store, 'lastDiscoveryAt') ?? null,
    lastBuildAt: metaNumber(store, 'lastBuildAt') ?? null,
    lastTickAt: metaNumber(store, 'lastTickAt') ?? null,
    lastError: store.getMeta('lastError') ?? null,
    top: live.filter(relay => relay.points > 0).sort((a, b) => b.points - a.points).slice(0, 25)
      .map(relay => ({ url: relay.url, points: relay.points, source: relay.source, nextCheckAt: relay.nextCheckAt })),
  };
}

/**
 * Serve `/healthz` and `/status`.
 * @param store Event store.
 * @param config Configuration.
 * @param staleAfterSeconds `/healthz` fails when no tick finished within this window (counted from start-up until the first tick).
 * @param startedAt Unix seconds when the service started.
 * @returns The listening server.
 * @example serve(store, config, 3600, startedAt)
 */
export function serve(store: EventStore, config: Config, staleAfterSeconds: number, startedAt: number): Server {
  const server = createServer((request, response) => {
    const json = (code: number, body: unknown) => {
      response.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify(body));
    };
    if (request.url === '/healthz') {
      const last = metaNumber(store, 'lastTickAt');
      const fresh = Math.floor(Date.now() / 1000) - Math.max(last ?? 0, startedAt) <= staleAfterSeconds;
      return json(fresh ? 200 : 503, { ok: fresh, lastTickAt: last ?? null });
    }
    if (request.url === '/status' || request.url === '/') return json(200, status(store));
    return json(404, { error: 'not found' });
  });
  server.listen(config.http.port, config.http.host);
  return server;
}
