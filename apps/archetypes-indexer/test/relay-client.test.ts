import { afterEach, describe, expect, it } from 'vitest';
import { acceptEvent, pageRelay, queryRelay, type Query } from '../src/relay-client.ts';
import { fakeRelay, manifest, type FakeRelay } from './helpers.ts';

const options = { timeoutMs: 2000, maxFrameBytes: 512 * 1024 };
let relay: FakeRelay | undefined;
afterEach(async () => { await relay?.close(); relay = undefined; });

describe('acceptEvent', () => {
  it('accepts signed events of the requested kinds only', () => {
    const event = manifest(35129, 'a');
    expect(acceptEvent(event, [35129])).toEqual({ ...event });
    expect(acceptEvent(event, [5129])).toBeNull();
    expect(acceptEvent({ ...event, content: 'tampered' }, [35129])).toBeNull();
    expect(acceptEvent({ nope: true })).toBeNull();
  });
});

describe('queryRelay', () => {
  it('collects verified events until EOSE and ignores junk frames', async () => {
    const events = [manifest(35129, 'a', [], 100), manifest(15129, '', [], 200)];
    relay = await fakeRelay(events, { junk: true });
    const result = await queryRelay(relay.url, { kinds: [5129, 15129, 35129] }, options);
    expect(result.ok).toBe(true);
    expect(result.connected).toBe(true);
    expect(result.events.map(event => event.id).sort()).toEqual(events.map(event => event.id).sort());
  });

  it('reports CLOSED as an incomplete answer', async () => {
    relay = await fakeRelay([], { closed: 'auth-required: no' });
    const result = await queryRelay(relay.url, { kinds: [35129] }, options);
    expect(result).toMatchObject({ ok: false, connected: true, error: 'closed: auth-required: no' });
  });

  it('times out a silent relay', async () => {
    relay = await fakeRelay([], { silent: true });
    const result = await queryRelay(relay.url, { kinds: [35129] }, { ...options, timeoutMs: 200 });
    expect(result).toMatchObject({ ok: false, connected: true, error: 'timeout' });
  });

  it('reports an unreachable relay as not connected', async () => {
    const result = await queryRelay('ws://127.0.0.1:1', { kinds: [35129] }, options);
    expect(result.connected).toBe(false);
    expect(result.ok).toBe(false);
  });

  it('drops oversized frames', async () => {
    relay = await fakeRelay([manifest(35129, 'big', [['description', 'x'.repeat(5000)]])]);
    const result = await queryRelay(relay.url, { kinds: [35129] }, { ...options, maxFrameBytes: 1000 });
    expect(result.events).toEqual([]);
  });
});

describe('pageRelay', () => {
  it('pages with until across many events, re-reading boundary seconds', async () => {
    const events = Array.from({ length: 23 }, (_, i) => manifest(35129, `app-${i}`, [], 1000 + Math.floor(i / 2)));
    relay = await fakeRelay(events);
    const query: Query = (url, filter) => queryRelay(url, filter, options);
    const page = await pageRelay(query, relay.url, { kinds: [35129] }, 5, 1000);
    expect(page.ok).toBe(true);
    expect(page.events).toHaveLength(23);
    expect(relay.requests.length).toBeGreaterThan(4);
  });

  it('respects since and the event cap', async () => {
    const events = Array.from({ length: 10 }, (_, i) => manifest(35129, `app-${i}`, [], 1000 + i));
    relay = await fakeRelay(events);
    const query: Query = (url, filter) => queryRelay(url, filter, options);
    expect((await pageRelay(query, relay.url, { kinds: [35129], since: 1006 }, 2, 100)).events).toHaveLength(4);
    expect((await pageRelay(query, relay.url, { kinds: [35129] }, 2, 3)).events).toHaveLength(3);
  });

  it('marks a mid-walk failure incomplete but keeps what it got', async () => {
    let calls = 0;
    const events = [manifest(35129, 'a', [], 10), manifest(35129, 'b', [], 9)];
    const query: Query = async () => (++calls === 1 ? { events, ok: true, connected: true } : { events: [], ok: false, connected: true, error: 'timeout' });
    const page = await pageRelay(query, 'wss://r.example', { kinds: [35129] }, 2, 100);
    expect(page).toMatchObject({ ok: false, connected: true, error: 'timeout' });
    expect(page.events).toHaveLength(2);
  });
});
