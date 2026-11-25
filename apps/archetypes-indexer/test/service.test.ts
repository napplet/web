import { afterEach, describe, expect, it } from 'vitest';
import { buildDue, lastSlot } from '../src/build.ts';
import { serve, status, tick } from '../src/service.ts';
import { EventStore } from '../src/store.ts';
import type { Query } from '../src/relay-client.ts';
import { newRelay } from '../src/schedule.ts';
import { testConfig } from './helpers.ts';
import type { Server } from 'node:http';

const at = (iso: string) => Date.parse(iso) / 1000;

describe('build schedule', () => {
  it('finds the latest daily slot at or before now', () => {
    expect(lastSlot(at('2026-11-25T06:00:00Z'), '05:30')).toBe(at('2026-11-25T05:30:00Z'));
    expect(lastSlot(at('2026-11-25T05:00:00Z'), '05:30')).toBe(at('2026-11-24T05:30:00Z'));
    expect(lastSlot(at('2026-11-25T05:30:00Z'), '05:30')).toBe(at('2026-11-25T05:30:00Z'));
  });

  it('builds once per slot, and on start only when asked', () => {
    expect(buildDue(at('2026-11-25T06:00:00Z'), '05:30', undefined, true)).toBe(true);
    expect(buildDue(at('2026-11-25T06:00:00Z'), '05:30', undefined, false)).toBe(false);
    expect(buildDue(at('2026-11-25T06:00:00Z'), '05:30', at('2026-11-25T05:31:00Z'), true)).toBe(false);
    expect(buildDue(at('2026-11-25T06:00:00Z'), '05:30', at('2026-11-24T05:31:00Z'), true)).toBe(true);
  });
});

describe('tick', () => {
  const emptyQuery: Query = async () => ({ events: [], ok: true, connected: true });

  it('discovers, crawls and builds on the first tick, then only crawls', async () => {
    const store = new EventStore(':memory:');
    const config = testConfig();
    config.discovery.seedRelays = ['wss://seed.example'];
    let builds = 0;
    const build = (async () => { builds++; store.setMeta('lastBuildAt', String(now)); return { outDir: '', deployed: false }; }) as never;
    let now = at('2026-11-25T06:00:00Z');
    const deps = { store, query: emptyQuery, config, secrets: {}, log: () => {}, now: () => now, build };
    expect(await tick(deps)).toEqual({ discovered: true, crawled: 1, built: true });
    now += 600;
    expect(await tick(deps)).toEqual({ discovered: false, crawled: 0, built: false });
    expect(builds).toBe(1);
    now = at('2026-11-26T06:10:00Z');
    expect(await tick(deps)).toMatchObject({ discovered: true, built: true });
  });

  it('skips all network work when the preflight says so', async () => {
    const store = new EventStore(':memory:');
    const config = testConfig();
    config.discovery.seedRelays = ['wss://seed.example'];
    let queried = 0;
    const query: Query = async () => { queried++; return { events: [], ok: true, connected: true }; };
    const result = await tick({ store, query, config, secrets: {}, log: () => {}, now: () => 50, preflight: async () => 'proxy unreachable; skipped this tick' });
    expect(result).toEqual({ discovered: false, crawled: 0, built: false, error: 'proxy unreachable; skipped this tick' });
    expect(queried).toBe(0);
    expect(store.getMeta('lastError')).toBe('50 proxy unreachable; skipped this tick');
  });

  it('records an error instead of throwing', async () => {
    const store = new EventStore(':memory:');
    const config = testConfig();
    const build = (async () => { throw new Error('astro failed'); }) as never;
    const result = await tick({ store, query: emptyQuery, config, secrets: {}, log: () => {}, now: () => 100, build });
    expect(result.error).toBe('astro failed');
    expect(store.getMeta('lastError')).toBe('100 astro failed');
    expect(store.getMeta('lastTickAt')).toBe('100');
  });
});

describe('HTTP status', () => {
  let server: Server | undefined;
  afterEach(() => new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve())));

  it('serves status, health and 404', async () => {
    const store = new EventStore(':memory:');
    store.saveRelays([{ ...newRelay('wss://a.example', 'seed', 1), points: 3 }, { ...newRelay('wss://b.example', 'nip66', 1), removedAt: 2 }]);
    store.putEvents([], 'wss://a.example', 1);
    expect(status(store)).toMatchObject({ events: 0, relays: { tracked: 1, withNapplets: 1, removed: 1 }, top: [{ url: 'wss://a.example', points: 3 }] });
    const config = testConfig();
    config.http = { host: '127.0.0.1', port: 0 };
    server = serve(store, config, 60, Math.floor(Date.now() / 1000));
    await new Promise(resolve => server!.once('listening', resolve));
    const { port } = server.address() as { port: number };
    const health = await fetch(`http://127.0.0.1:${port}/healthz`);
    expect(health.status).toBe(200);
    expect((await (await fetch(`http://127.0.0.1:${port}/status`)).json()).relays.tracked).toBe(1);
    expect((await fetch(`http://127.0.0.1:${port}/nope`)).status).toBe(404);
  });

  it('reports unhealthy when ticks stop', async () => {
    const store = new EventStore(':memory:');
    store.setMeta('lastTickAt', '1');
    const config = testConfig();
    config.http = { host: '127.0.0.1', port: 0 };
    server = serve(store, config, 60, 1);
    await new Promise(resolve => server!.once('listening', resolve));
    const { port } = server.address() as { port: number };
    expect((await fetch(`http://127.0.0.1:${port}/healthz`)).status).toBe(503);
  });
});
