// ─── Entry point ────────────────────────────────────────────────────────────
// `node src/main.ts [--once] [--build]`
//   (no flags)  run forever: discovery, crawl, daily build + deploy
//   --once      run a single iteration and exit
//   --build     export, build and deploy now, then exit
// Config: ARCHETYPES_YAML (inline) or ARCHETYPES_CONFIG (file), both optional; ARCHETYPES_DATA_DIR overrides
// the data directory. Secrets: BUNNY_* environment variables.

import { join } from 'node:path';
import { configFromEnv, secretsFromEnv } from './config.ts';
import { queryRelay } from './relay-client.ts';
import { EventStore } from './store.ts';
import { serve, tick } from './service.ts';
import { runBuild } from './build.ts';
import type { Log } from './crawl.ts';

const log: Log = (message, fields = {}) => console.log(JSON.stringify({ at: new Date().toISOString(), message, ...fields }));

const config = configFromEnv(process.env);
const secrets = secretsFromEnv(process.env, config);
const store = new EventStore(join(config.dataDir, 'archetypes.sqlite'));
const query = (url: string, filter: Parameters<typeof queryRelay>[1]) => queryRelay(url, filter, { timeoutMs: config.crawl.timeoutSeconds * 1000, maxFrameBytes: config.crawl.maxFrameBytes });
const deps = { store, query, config, secrets, log };
const args = new Set(process.argv.slice(2));

if (args.has('--build')) {
  await runBuild(store, config, secrets, Math.floor(Date.now() / 1000), log);
  store.close();
} else if (args.has('--once')) {
  const result = await tick(deps);
  log('tick', { ...result });
  store.close();
  if (result.error) process.exitCode = 1;
} else {
  const startedAt = Math.floor(Date.now() / 1000);
  const tickMs = config.crawl.tickMinutes * 60_000;
  // A tick can run long (a first crawl of every known relay); health allows for that.
  const server = serve(store, config, Math.max(6 * 3600, config.crawl.tickMinutes * 60 * 3), startedAt);
  log('start', { port: config.http.port, dataDir: config.dataDir });
  let stopping = false;
  const stop = () => { stopping = true; server.close(); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  while (!stopping) {
    const result = await tick(deps);
    log('tick', { ...result });
    const until = Date.now() + tickMs;
    while (!stopping && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  store.close();
}
