// Snapshot signed relay events for offline catalog rendering. No signing or execution.
import { createRequire } from 'node:module';
import { writeFile, rename } from 'node:fs/promises';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { validateEvent, verifyEvent } = require('nostr-tools/pure');
const config = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../apps/web/src/data/discovery.json', import.meta.url), 'utf8'));
const events = new Map();
const results = await Promise.all(config.relays.map(url => new Promise(resolve => {
  const socket = new WebSocket(url);
  let ended = false;
  function finish(ok) { if (ended) return; ended = true; clearTimeout(timer); socket.close(); resolve({ url, ok }); }
  const timer = setTimeout(() => finish(false), config.timeoutMs);
  socket.onopen = () => socket.send(JSON.stringify(['REQ', 'showcase', { kinds: [5129, 15129, 35129], limit: config.limit }]));
  socket.onerror = () => finish(false);
  socket.onclose = () => finish(false);
  socket.onmessage = ({ data }) => {
    if (typeof data !== 'string' || data.length > 100000) return;
    try {
      const [type, subscription, event] = JSON.parse(data);
      if (subscription !== 'showcase') return;
      if (type === 'EOSE') return finish(true);
      if (type !== 'EVENT' || !validateEvent(event) || !verifyEvent(event) || events.size >= 200) return;
      events.set(event.id, event);
    } catch { /* Ignore non-event relay frames. */ }
  };
})));
if (!results.some(result => result.ok)) throw new Error('No relay completed a query; existing snapshot retained.');
const output = new URL('../apps/web/src/data/discovered-apps.json', import.meta.url);
const temporary = new URL(`${output.href}.tmp`);
await writeFile(temporary, JSON.stringify({ checkedAt: new Date().toISOString(), relays: config.relays, events: [...events.values()] }, null, 2) + '\n');
await rename(temporary, output);
console.log(`Saved ${events.size} signed events. ${JSON.stringify(results)}`);
