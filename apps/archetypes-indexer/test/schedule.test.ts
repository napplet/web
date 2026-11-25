import { describe, expect, it } from 'vitest';
import { applyCrawl, backoffSeconds, dueRelays, mergeDiscovery, newRelay, runtimeRelays, type RelayState } from '../src/schedule.ts';

const HOUR = 3600;
const DAY = 24 * HOUR;
const config = { backoffHours: [24, 72, 168, 336, 720], offlineAfterFailures: 3, pointsPerNapplet: 1 };
const now = 1_700_000_000;

describe('backoff', () => {
  it('walks 1d → 3d → 7d → 14d → 30d and stays at 30d', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(streak => backoffSeconds(streak, config.backoffHours) / DAY)).toEqual([1, 3, 7, 14, 30, 30, 30]);
  });

  it('backs off a reachable relay that never served a napplet, step by step', () => {
    let state = newRelay('wss://empty.example', 'nip66', now);
    const gaps: number[] = [];
    let at = now;
    for (let i = 0; i < 6; i++) {
      state = applyCrawl(state, { at, connected: true, ok: true, totalNapplets: 0 }, config);
      gaps.push((state.nextCheckAt - at) / DAY);
      at = state.nextCheckAt;
    }
    expect(gaps).toEqual([3, 7, 14, 30, 30, 30]);
    expect(state.points).toBe(0);
  });

  it('returns to the daily cadence as soon as a relay serves a napplet', () => {
    let state: RelayState = { ...newRelay('wss://r.example', 'nip66', now), zeroStreak: 3 };
    state = applyCrawl(state, { at: now, connected: true, ok: true, totalNapplets: 2 }, config);
    expect(state.points).toBe(2);
    expect(state.zeroStreak).toBe(0);
    expect(state.nextCheckAt - now).toBe(DAY);
  });

  it('scales points and never lowers them', () => {
    let state = applyCrawl(newRelay('wss://r.example', 'nip66', now), { at: now, connected: true, ok: true, totalNapplets: 4 }, { ...config, pointsPerNapplet: 5 });
    expect(state.points).toBe(20);
    state = applyCrawl(state, { at: now + DAY, connected: true, ok: true, totalNapplets: 1 }, { ...config, pointsPerNapplet: 5 });
    expect(state.points).toBe(20);
  });

  it('does not count an incomplete answer as an empty relay', () => {
    const state = applyCrawl(newRelay('wss://r.example', 'nip66', now), { at: now, connected: true, ok: false, totalNapplets: 0, error: 'timeout' }, config);
    expect(state.zeroStreak).toBe(0);
    expect(state.lastError).toBe('timeout');
    expect(state.lastOkAt).toBeUndefined();
  });
});

describe('offline removal', () => {
  it('removes a discovered relay after consecutive failed connections', () => {
    let state = newRelay('wss://gone.example', 'nip66', now);
    for (let i = 0; i < 2; i++) state = applyCrawl(state, { at: now + i * DAY, connected: false, ok: false, totalNapplets: 0 }, config);
    expect(state.removedAt).toBeUndefined();
    expect(state.failures).toBe(2);
    state = applyCrawl(state, { at: now + 2 * DAY, connected: false, ok: false, totalNapplets: 0 }, config);
    expect(state.removedAt).toBe(now + 2 * DAY);
  });

  it('resets the failure count after a successful connection', () => {
    let state = applyCrawl(newRelay('wss://flaky.example', 'nip66', now), { at: now, connected: false, ok: false, totalNapplets: 0 }, config);
    state = applyCrawl(state, { at: now + DAY, connected: true, ok: true, totalNapplets: 0 }, config);
    expect(state.failures).toBe(0);
  });

  it('never removes a seed relay but backs it off', () => {
    let state = newRelay('wss://seed.example', 'seed', now);
    let at = now;
    const gaps: number[] = [];
    for (let i = 0; i < 5; i++) {
      state = applyCrawl(state, { at, connected: false, ok: false, totalNapplets: 0 }, config);
      gaps.push((state.nextCheckAt - at) / DAY);
      at = state.nextCheckAt;
    }
    expect(state.removedAt).toBeUndefined();
    expect(gaps).toEqual([1, 1, 3, 7, 14]);
    expect(state.failures).toBe(5);
  });
});

describe('mergeDiscovery', () => {
  it('adds new relays due now and records evidence', () => {
    const out = mergeDiscovery(new Map(), new Map([['wss://new.example', now - 10]]), now);
    expect(out.get('wss://new.example')).toMatchObject({ source: 'nip66', nextCheckAt: now, lastSeenAt: now - 10 });
  });

  it('keeps a removed relay out until a monitor reports it after the removal', () => {
    const removed: RelayState = { ...newRelay('wss://gone.example', 'nip66', now - 10 * DAY), removedAt: now - DAY, failures: 3 };
    const stale = mergeDiscovery(new Map([[removed.url, removed]]), new Map([[removed.url, now - 2 * DAY]]), now);
    expect(stale.get(removed.url)?.removedAt).toBe(now - DAY);
    const fresh = mergeDiscovery(new Map([[removed.url, removed]]), new Map([[removed.url, now - HOUR]]), now);
    expect(fresh.get(removed.url)).toMatchObject({ failures: 0, nextCheckAt: now });
    expect(fresh.get(removed.url)?.removedAt).toBeUndefined();
  });

  it('does not reset the schedule of a known relay', () => {
    const known: RelayState = { ...newRelay('wss://k.example', 'nip66', now - DAY), nextCheckAt: now + 5 * DAY, points: 3 };
    const out = mergeDiscovery(new Map([[known.url, known]]), new Map([[known.url, now]]), now);
    expect(out.get(known.url)).toMatchObject({ nextCheckAt: now + 5 * DAY, points: 3, lastSeenAt: now });
  });
});

describe('dueRelays and runtimeRelays', () => {
  const states: RelayState[] = [
    { ...newRelay('wss://a.example', 'nip66', now), points: 1, nextCheckAt: now - 10 },
    { ...newRelay('wss://b.example', 'nip66', now), points: 9, nextCheckAt: now },
    { ...newRelay('wss://c.example', 'nip66', now), points: 0, nextCheckAt: now + 10 },
    { ...newRelay('wss://d.example', 'nip66', now), points: 5, nextCheckAt: now, removedAt: now },
    { ...newRelay('wss://e.example', 'nip66', now), points: 7, nextCheckAt: now + 99, failures: 1 },
  ];

  it('lists due, unremoved relays by score', () => {
    expect(dueRelays(states, now).map(state => state.url)).toEqual(['wss://b.example', 'wss://a.example']);
  });

  it('hands browsers the best reachable relays plus pinned ones', () => {
    expect(runtimeRelays(states, 1, ['wss://pinned.example'])).toEqual(['wss://pinned.example', 'wss://b.example']);
    expect(runtimeRelays(states, 6, ['wss://a.example'])).toEqual(['wss://a.example', 'wss://b.example']);
  });
});
