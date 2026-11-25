import { describe, expect, it } from 'vitest';
import { EventStore, nappletKey } from '../src/store.ts';
import { newRelay } from '../src/schedule.ts';
import { manifest, otherKey } from './helpers.ts';
import { finalizeEvent } from 'nostr-tools/pure';

describe('nappletKey', () => {
  it('uses the id for snapshots and the address for replaceable manifests', () => {
    const snapshot = manifest(5129, 'snap');
    expect(nappletKey(snapshot)).toBe(snapshot.id);
    expect(nappletKey(manifest(35129, 'notes'))).toMatch(/^35129:[0-9a-f]{64}:notes$/);
    expect(nappletKey(manifest(15129, ''))).toMatch(/^15129:[0-9a-f]{64}:$/);
  });
});

describe('EventStore', () => {
  it('stores each event once, records every relay that served it, and counts napplets per relay', () => {
    const store = new EventStore(':memory:');
    const v1 = manifest(35129, 'notes', [], 100);
    const v2 = manifest(35129, 'notes', [], 200);
    const other = manifest(35129, 'feed', [], 150, otherKey);
    expect(store.putEvents([v1, v2, other], 'wss://a.example', 1)).toBe(3);
    expect(store.putEvents([v2], 'wss://b.example', 2)).toBe(0);
    expect(store.eventCount()).toBe(3);
    expect(store.nappletsOn('wss://a.example')).toBe(2);
    expect(store.nappletsOn('wss://b.example')).toBe(1);
    expect(store.nappletsOn('wss://none.example')).toBe(0);
    expect(store.allEvents().map(event => event.created_at)).toEqual([100, 150, 200]);
    expect(store.sightingsByEvent().get(v2.id)).toEqual(['wss://a.example', 'wss://b.example']);
  });

  it('ignores events of other kinds', () => {
    const store = new EventStore(':memory:');
    const note = finalizeEvent({ kind: 1, created_at: 1, content: 'hi', tags: [] }, otherKey);
    expect(store.putEvents([note], 'wss://a.example', 1)).toBe(0);
    expect(store.eventCount()).toBe(0);
  });

  it('round-trips relay state and meta', () => {
    const store = new EventStore(':memory:');
    const state = { ...newRelay('wss://a.example', 'seed', 5), points: 3 };
    store.saveRelays([state]);
    expect(store.relays().get('wss://a.example')).toEqual(state);
    store.saveRelay({ ...state, points: 4 });
    expect(store.relays().get('wss://a.example')?.points).toBe(4);
    expect(store.getMeta('x')).toBeUndefined();
    store.setMeta('x', '1');
    store.setMeta('x', '2');
    expect(store.getMeta('x')).toBe('2');
    store.close();
  });
});
