import { describe, expect, it } from 'vitest';
import { buildSnapshot } from '../src/export.ts';
import { EventStore } from '../src/store.ts';
import { newRelay } from '../src/schedule.ts';
import { manifest, testConfig } from './helpers.ts';

describe('buildSnapshot', () => {
  it('exports events, relay hints by score, runtime relays and stats', () => {
    const store = new EventStore(':memory:');
    const event = manifest(35129, 'notes', [['z', 'note']]);
    for (const url of ['wss://a.example', 'wss://b.example', 'wss://c.example', 'wss://d.example']) store.putEvents([event], url, 1);
    store.saveRelays([
      { ...newRelay('wss://a.example', 'nip66', 1), points: 1 },
      { ...newRelay('wss://b.example', 'nip66', 1), points: 9 },
      { ...newRelay('wss://c.example', 'nip66', 1), points: 5 },
      { ...newRelay('wss://d.example', 'nip66', 1), points: 3 },
      { ...newRelay('wss://gone.example', 'nip66', 1), points: 4, removedAt: 2 },
      { ...newRelay('wss://zero.example', 'nip66', 1) },
    ]);
    const config = testConfig();
    config.build.runtimeTopRelays = 2;
    config.build.runtimePinnedRelays = ['wss://Pinned.example/'];
    const snapshot = buildSnapshot(store, config, 1234);
    expect(snapshot.generatedAt).toBe(1234);
    expect(snapshot.events).toHaveLength(1);
    expect(snapshot.relayHints[event.id]).toEqual(['wss://b.example', 'wss://c.example', 'wss://d.example']);
    expect(snapshot.runtime).toEqual({ relays: ['wss://pinned.example', 'wss://b.example', 'wss://c.example'], timeoutMs: config.build.runtimeTimeoutMs });
    expect(snapshot.relays.map(relay => relay.url)).toEqual(['wss://b.example', 'wss://c.example', 'wss://d.example', 'wss://a.example']);
    expect(snapshot.stats).toEqual({ tracked: 5, withNapplets: 4, removed: 1 });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});
