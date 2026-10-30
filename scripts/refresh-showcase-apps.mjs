// Snapshot signed relay events for offline catalog rendering. No signing or execution.
import { createRequire } from 'node:module';
import { readFile, writeFile, rename } from 'node:fs/promises';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { validateEvent, verifyEvent } = require('nostr-tools/pure');
const config = JSON.parse(await readFile(new URL('../apps/web/src/data/discovery.json', import.meta.url), 'utf8'));
const MANIFEST_KINDS = [5129, 15129, 35129];
const APPLICATION_KIND = 32267;
const MAX_EVENTS = config.maxEvents ?? 600;

/** One bounded request; resolves with verified events and whether the relay reached EOSE. */
function request(url, filter) {
  return new Promise(resolve => {
    const events = [];
    const socket = new WebSocket(url);
    let ended = false;
    function finish(ok) { if (ended) return; ended = true; clearTimeout(timer); socket.close(); resolve({ events, ok }); }
    const timer = setTimeout(() => finish(false), config.timeoutMs);
    socket.onopen = () => socket.send(JSON.stringify(['REQ', 'showcase', filter]));
    socket.onerror = () => finish(false);
    socket.onclose = () => finish(false);
    socket.onmessage = ({ data }) => {
      if (typeof data !== 'string' || data.length > 100000) return;
      try {
        const [type, subscription, event] = JSON.parse(data);
        if (subscription !== 'showcase') return;
        if (type === 'EOSE') return finish(true);
        if (type !== 'EVENT' || !validateEvent(event) || !verifyEvent(event) || events.length >= config.limit) return;
        events.push(event);
      } catch { /* Ignore non-event relay frames. */ }
    };
  });
}

/** Page backwards with `until` until a relay runs out of manifests or the cap is reached. */
async function manifests(url) {
  const found = new Map();
  let until;
  let ok = false;
  for (let page = 0; page < Math.ceil(MAX_EVENTS / config.limit); page++) {
    const filter = { kinds: MANIFEST_KINDS, limit: config.limit, ...(until ? { until } : {}) };
    const result = await request(url, filter);
    ok ||= result.ok;
    const fresh = result.events.filter(event => !found.has(event.id));
    fresh.forEach(event => found.set(event.id, event));
    if (!result.ok || !fresh.length || result.events.length < config.limit) break;
    until = Math.min(...result.events.map(event => event.created_at)) - 1;
  }
  return { url, ok, events: [...found.values()] };
}

const results = await Promise.all(config.relays.map(manifests));
if (!results.some(result => result.ok)) throw new Error('No relay completed a query; existing snapshot retained.');
const events = new Map(results.flatMap(result => result.events).map(event => [event.id, event]));

// Application listings (kind 32267) by the same publishers supply fallback artwork; they are a separate proposal.
const authors = [...new Set([...events.values()].map(event => event.pubkey))];
const applications = new Map();
for (let index = 0; index < authors.length; index += 50) {
  const slice = authors.slice(index, index + 50);
  const listings = await Promise.all(config.relays.map(url => request(url, { kinds: [APPLICATION_KIND], authors: slice, limit: config.limit })));
  for (const event of listings.flatMap(result => result.events)) {
    const key = `${event.pubkey}:${event.tags.find(tag => tag[0] === 'd')?.[1] ?? ''}`;
    const old = applications.get(key);
    if (!old || event.created_at > old.created_at) applications.set(key, event);
  }
}

const output = new URL('../apps/web/src/data/discovered-apps.json', import.meta.url);
const temporary = new URL(`${output.href}.tmp`);
const byTime = (a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id);
await writeFile(temporary, JSON.stringify({
  checkedAt: new Date().toISOString(), relays: config.relays,
  events: [...events.values()].sort(byTime), applications: [...applications.values()].sort(byTime),
}, null, 2) + '\n');
await rename(temporary, output);
console.log(`Saved ${events.size} signed manifests and ${applications.size} listings. ${JSON.stringify(results.map(({ url, ok, events }) => ({ url, ok, events: events.length })))}`);
