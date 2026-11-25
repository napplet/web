import { afterEach, describe, expect, it } from 'vitest';
import { crawlDue, crawlRelay, ensureSeeds, pool, runDiscovery } from '../src/crawl.ts';
import { discoverRelays, relaysFromDiscovery } from '../src/nip66.ts';
import { queryRelay, type Query } from '../src/relay-client.ts';
import { newRelay } from '../src/schedule.ts';
import { EventStore } from '../src/store.ts';
import { discovery, fakeRelay, manifest, testConfig, type FakeRelay } from './helpers.ts';

const DAY = 86_400;
const now = 1_800_000_000;
const relays: FakeRelay[] = [];
const query: Query = (url, filter) => queryRelay(url, filter, { timeoutMs: 2000, maxFrameBytes: 512 * 1024 });
const log = () => {};
afterEach(async () => { await Promise.all(relays.splice(0).map(relay => relay.close())); });

describe('pool', () => {
  it('keeps order and bounds concurrency', async () => {
    let active = 0;
    let peak = 0;
    const out = await pool([1, 2, 3, 4, 5], 2, async n => {
      active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBe(2);
  });
});

describe('NIP-66 discovery', () => {
  it('normalises, de-duplicates and keeps the newest evidence', () => {
    const map = relaysFromDiscovery([discovery('wss://A.example/', 10), discovery('wss://a.example', 20), discovery('https://bad.example', 30), discovery('wss://localhost', 40)], false);
    expect([...map]).toEqual([['wss://a.example', 20]]);
  });

  it('asks monitors only for recent events and merges them', async () => {
    const monitor = await fakeRelay([discovery('wss://one.example', now - DAY), discovery('wss://two.example/', now - 2 * DAY), discovery('wss://old.example', now - 30 * DAY)]);
    relays.push(monitor);
    const result = await discoverRelays(query, [monitor.url], { now, lookbackDays: 7, pageLimit: 100, maxEvents: 1000, allowPrivateHosts: false });
    expect([...result.relays.keys()].sort()).toEqual(['wss://one.example', 'wss://two.example']);
    expect(result.answered).toEqual([monitor.url]);
    expect(monitor.requests[0].since).toBe(now - 7 * DAY);
  });
});

describe('ensureSeeds', () => {
  it('adds seeds and promotes a discovered relay to seed, restoring it if removed', () => {
    const config = testConfig();
    config.discovery.seedRelays = ['wss://seed.example/', 'wss://known.example'];
    const known = { ...newRelay('wss://known.example', 'nip66' as const, 1), removedAt: 5 };
    const out = ensureSeeds(new Map([[known.url, known]]), config, now);
    expect(out.get('wss://seed.example')).toMatchObject({ source: 'seed', nextCheckAt: now });
    expect(out.get('wss://known.example')?.source).toBe('seed');
    expect(out.get('wss://known.example')?.removedAt).toBeUndefined();
  });
});

describe('crawl cycle', () => {
  it('discovers relays from a monitor, crawls them, scores the ones with napplets and backs off the empty one', async () => {
    const full = await fakeRelay([manifest(35129, 'notes', [['z', 'note']], now - 100), manifest(5129, 'snap', [], now - 50)]);
    const empty = await fakeRelay([]);
    const monitor = await fakeRelay([discovery(full.url, now - DAY), discovery(empty.url, now - DAY)]);
    relays.push(full, empty, monitor);
    const config = testConfig();
    config.discovery.monitorRelays = [monitor.url];
    const store = new EventStore(':memory:');
    expect(await runDiscovery(store, query, config, now, log)).toBe(2);
    const totals = await crawlDue(store, query, config, now, log);
    expect(totals).toEqual({ crawled: 2, fresh: 2, removed: 0 });
    const states = store.relays();
    expect(states.get(full.url)).toMatchObject({ points: 2, zeroStreak: 0, nextCheckAt: now + DAY, lastOkAt: now });
    expect(states.get(empty.url)).toMatchObject({ points: 0, zeroStreak: 1, nextCheckAt: now + 3 * DAY });
    expect(store.getMeta('lastDiscoveryAt')).toBe(String(now));
    expect(await crawlDue(store, query, config, now + 1, log)).toEqual({ crawled: 0, fresh: 0, removed: 0 });
  });

  it('crawls a scored relay incrementally from its last good crawl minus the overlap', async () => {
    const relay = await fakeRelay([manifest(35129, 'notes', [], now - 100)]);
    relays.push(relay);
    const config = testConfig();
    const store = new EventStore(':memory:');
    const state = { ...newRelay(relay.url, 'nip66' as const, now), points: 1, lastOkAt: now - DAY };
    await crawlRelay(state, store, query, config, now);
    expect(relay.requests[0].since).toBe(now - DAY - config.crawl.overlapHours * 3600);
    const blank = { ...newRelay(relay.url, 'nip66' as const, now) };
    await crawlRelay(blank, store, query, config, now);
    expect(relay.requests.at(-1)?.since).toBeUndefined();
  });

  it('removes a relay that keeps refusing connections', async () => {
    const config = testConfig();
    const store = new EventStore(':memory:');
    let state = newRelay('ws://127.0.0.1:1', 'nip66', now);
    for (let i = 0; i < config.crawl.offlineAfterFailures; i++) state = (await crawlRelay(state, store, query, config, now + i * DAY)).state;
    expect(state.removedAt).toBeDefined();
    expect(store.relays().get(state.url)?.removedAt).toBeDefined();
  });
});
