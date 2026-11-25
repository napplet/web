// Regenerate src/data/snapshot.json, the offline seed used by `astro build` when no
// indexer snapshot is supplied (ARCHETYPES_SNAPSHOT). It reuses the signed events the
// napplet.run app store already saved from public relays, so builds need no network.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../../../', import.meta.url);
const saved = JSON.parse(readFileSync(new URL('apps/web/src/data/discovered-apps.json', root), 'utf8'));
const discovery = JSON.parse(readFileSync(new URL('apps/web/src/data/discovery.json', root), 'utf8'));
const kinds = new Set([5129, 15129, 35129]);
const events = saved.events.filter(event => kinds.has(event.kind)).sort((a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id));
const snapshot = {
  version: 1,
  generatedAt: Math.max(...events.map(event => event.created_at)),
  siteUrl: 'https://archetypes.napplet.run',
  events,
  relayHints: {},
  runtime: { relays: discovery.relays, timeoutMs: 8000 },
  relays: [],
  stats: { tracked: 0, withNapplets: 0, removed: 0 },
};
const out = fileURLToPath(new URL('../src/data/snapshot.json', import.meta.url));
writeFileSync(out, `${JSON.stringify(snapshot)}\n`);
console.log(`Wrote ${events.length} events to ${out}`);
