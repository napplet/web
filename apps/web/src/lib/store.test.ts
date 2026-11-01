import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { EventStore } from 'applesauce-core';
import type { Filter } from 'applesauce-core/helpers';
import type { RelayPool } from 'applesauce-relay';
import { finalizeEvent, getPublicKey, type Event } from 'nostr-tools/pure';
import { fetchLabels, previewsFor } from './store';

vi.mock('../data/discovery.json', async () => {
  const { getPublicKey } = await import('nostr-tools/pure');
  return { default: { relays: ['first', 'second'], limit: 2, timeoutMs: 100, screenshotLabelers: [getPublicKey(new Uint8Array(32).fill(1))] } };
});

const key = new Uint8Array(32).fill(1);
const manifest = finalizeEvent({ kind: 15129, created_at: 1, content: 'A saved release', tags: [['x', 'a'.repeat(64)], ['title', 'Saved']] }, key);
const label = (created_at: number) => finalizeEvent({ kind: 1985, created_at, content: 'Screenshot label', tags: [['e', manifest.id], ['L', '#screenshot']] }, key);

function discovery(request: (url: string, filter: Filter) => { events: Event[]; complete: boolean }) {
  const store = new EventStore();
  store.add(manifest);
  const pool = { relay: (url: string) => ({ req: (filter: Filter) => {
    const result = request(url, filter);
    return of(...result.events.map(event => ({ type: 'EVENT', event })), { type: result.complete ? 'EOSE' : 'CLOSED' });
  } }) } as unknown as RelayPool;
  return { pool, store, labeled: new Set<string>(), queriedAuthors: new Set<string>(), receive: 0, paged: new Set<string>(), done: new Set<string>() };
}

describe('live label discovery', () => {
  it('pages each relay independently when histories have different oldest timestamps', async () => {
    const histories: Record<string, Event[]> = { first: [label(100), label(90), label(80)], second: [label(10)] };
    const calls: [string, number | undefined][] = [];
    const state = discovery((url, filter) => {
      calls.push([url, filter.until]);
      return { events: histories[url].filter(event => event.created_at <= (filter.until ?? Infinity)).slice(0, filter.limit), complete: true };
    });
    await fetchLabels(state, new AbortController().signal);
    expect(state.store.getByFilters({ kinds: [1985] }).map(event => event.created_at).sort((a, b) => b - a)).toEqual([100, 90, 80, 10]);
    // The boundary timestamp is re-read inclusively, so labels sharing it are never skipped.
    expect(calls.filter(([url]) => url === 'first')).toEqual([['first', undefined], ['first', 90], ['first', 80]]);
    expect(calls.filter(([url]) => url === 'second')).toEqual([['second', undefined]]);
    expect(state.labeled.has(manifest.id)).toBe(true);
    await fetchLabels(state, new AbortController().signal);
    expect(calls).toHaveLength(4);
  });

  it('retries an incomplete batch and keeps successful results from the previous pass', async () => {
    let failed = true;
    const calls: string[] = [];
    const state = discovery((url) => {
      calls.push(url);
      return { events: url === 'first' ? [label(100)] : failed ? [] : [label(80)], complete: url === 'first' || !failed };
    });
    await fetchLabels(state, new AbortController().signal);
    expect(state.labeled.has(manifest.id)).toBe(false);
    expect(state.store.getEvent(label(100).id)).toBeDefined();
    failed = false;
    await fetchLabels(state, new AbortController().signal);
    expect(calls).toEqual(['first', 'second', 'first', 'second']);
    expect(state.store.getEvent(label(80).id)).toBeDefined();
    expect(state.labeled.has(manifest.id)).toBe(true);
  });

  it('asks only for the releases whose cards want a preview and resolves their verified labels', async () => {
    const pubkey = getPublicKey(key);
    const hash = 'a'.repeat(64);
    const trusted = finalizeEvent({ kind: 1985, created_at: 50, content: 'Signed-out napplet preview captured by Napshot.', tags: [
      ['L', '#screenshot'], ['l', hash, '#screenshot'], ['e', manifest.id], ['a', `15129:${pubkey}:`], ['p', pubkey],
      ['screenshot', `x ${hash}`, 'm image/png', 'dim 1200x750', 'size 4096'], ['server', 'https://mirror.example'],
    ] }, key);
    const other = finalizeEvent({ kind: 35129, created_at: 2, content: 'Another saved release', tags: [['d', 'other'], ['x', 'b'.repeat(64)], ['title', 'Other']] }, key);
    const pinned = finalizeEvent({ kind: 5129, created_at: 3, content: 'A pinned snapshot', tags: [['x', 'c'.repeat(64)], ['title', 'Pinned']] }, key);
    const calls: string[][] = [];
    const state = discovery((_, filter) => { calls.push(filter['#e'] ?? []); return { events: [trusted], complete: true }; });
    state.store.add(other);
    state.store.add(pinned);
    await fetchLabels(state, new AbortController().signal, [manifest.id, pinned.id, 'f'.repeat(64)]);
    // One request per relay, naming only the eligible release: the snapshot and the unknown id are never targets.
    expect(calls).toEqual([[manifest.id], [manifest.id]]);
    expect(state.labeled.has(manifest.id)).toBe(true);
    expect(state.labeled.has(other.id)).toBe(false);
    const previews = previewsFor(state, [manifest.id, other.id]);
    expect(previews.get(manifest.id)).toMatchObject({ sha256: hash, signer: pubkey, mode: 'signed-out', label: trusted.id });
    expect(previews.has(other.id)).toBe(false);
  });

  it('leaves an aborted pass retryable without issuing requests', async () => {
    const request = vi.fn(() => ({ events: [], complete: true }));
    const state = discovery(request);
    const controller = new AbortController();
    controller.abort();
    await fetchLabels(state, controller.signal);
    expect(request).not.toHaveBeenCalled();
    expect(state.labeled.size).toBe(0);
  });
});
