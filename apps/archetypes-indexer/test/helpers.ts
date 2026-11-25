import { finalizeEvent, generateSecretKey, type Event } from 'nostr-tools/pure';
import { WebSocketServer, type WebSocket as WsSocket } from 'ws';
import type { Filter } from 'nostr-tools/filter';
import { matchFilter } from 'nostr-tools/filter';
import type { Config } from '../src/config.ts';
import { DEFAULTS } from '../src/config.ts';

export const key = generateSecretKey();
export const otherKey = generateSecretKey();

/** Sign a manifest-like event for tests. */
export function manifest(kind: number, d: string, tags: string[][] = [], createdAt = 1_700_000_000, sk = key): Event {
  const base = kind === 5129 ? [] : kind === 35129 ? [['d', d]] : [];
  return finalizeEvent({ kind, created_at: createdAt, content: `${d} description`, tags: [...base, ['x', 'a'.repeat(64)], ...tags] }, sk);
}

export function discovery(url: string, createdAt: number): Event {
  return finalizeEvent({ kind: 30166, created_at: createdAt, content: '', tags: [['d', url]] }, key);
}

export function testConfig(overrides: Partial<Config> = {}): Config {
  const config = structuredClone(DEFAULTS);
  config.crawl.allowPrivateHosts = true;
  config.discovery.monitorRelays = [];
  config.discovery.seedRelays = [];
  return { ...config, ...overrides };
}

export interface FakeRelay { url: string; requests: Filter[]; close(): Promise<void> }

/** A NIP-01 relay over real WebSockets that answers REQ from a fixed event list. */
export async function fakeRelay(events: Event[], behaviour: { closed?: string; silent?: boolean; junk?: boolean } = {}): Promise<FakeRelay> {
  const server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const requests: Filter[] = [];
  server.on('connection', (socket: WsSocket) => {
    socket.on('message', raw => {
      const frame = JSON.parse(String(raw));
      if (frame[0] !== 'REQ') return;
      const [, sub, filter] = frame as [string, string, Filter];
      requests.push(filter);
      if (behaviour.silent) return;
      if (behaviour.closed) { socket.send(JSON.stringify(['CLOSED', sub, behaviour.closed])); return; }
      if (behaviour.junk) {
        socket.send('not json');
        socket.send(JSON.stringify(['EVENT', 'other-sub', events[0]]));
        socket.send(JSON.stringify(['EVENT', sub, { ...events[0], sig: '0'.repeat(128) }]));
      }
      const { limit, ...rest } = filter;
      const matches = events.filter(event => matchFilter(rest, event)).sort((a, b) => b.created_at - a.created_at).slice(0, limit ?? Infinity);
      for (const event of matches) socket.send(JSON.stringify(['EVENT', sub, event]));
      socket.send(JSON.stringify(['EOSE', sub]));
    });
  });
  const { port } = server.address() as { port: number };
  return { url: `ws://127.0.0.1:${port}`, requests, close: () => new Promise(resolve => { for (const client of server.clients) client.terminate(); server.close(() => resolve()); }) };
}
