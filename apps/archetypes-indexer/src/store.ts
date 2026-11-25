// ─── SQLite event store ─────────────────────────────────────────────────────
// Holds every verified napplet manifest (kinds 5129, 15129, 35129) exactly as
// signed, which relays served it, and the crawler's per-relay state.

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Event } from 'nostr-tools/pure';
import type { RelayState } from './schedule.ts';

/** NIP-5D manifest kinds: snapshot, root, named. */
export const MANIFEST_KINDS = [5129, 15129, 35129] as const;

/**
 * Identity of the napplet a manifest describes: the event id for a snapshot, the address otherwise.
 * @param event Manifest event.
 * @returns A stable napplet key.
 * @example nappletKey(event) // '35129:<pubkey>:notes'
 */
export function nappletKey(event: Pick<Event, 'id' | 'kind' | 'pubkey' | 'tags'>): string {
  if (event.kind === 5129) return event.id;
  const d = event.kind === 35129 ? event.tags.find(tag => tag[0] === 'd')?.[1] ?? '' : '';
  return `${event.kind}:${event.pubkey}:${d}`;
}

export class EventStore {
  readonly db: DatabaseSync;

  /**
   * Open (and migrate) a store.
   * @param path Database file, or `:memory:`.
   * @example const store = new EventStore('./data/archetypes.sqlite');
   */
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        kind INTEGER NOT NULL,
        pubkey TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        napplet TEXT NOT NULL,
        json TEXT NOT NULL,
        first_seen INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS events_napplet ON events (napplet, created_at);
      CREATE TABLE IF NOT EXISTS sightings (
        event_id TEXT NOT NULL,
        relay TEXT NOT NULL,
        seen_at INTEGER NOT NULL,
        PRIMARY KEY (event_id, relay)
      );
      CREATE INDEX IF NOT EXISTS sightings_relay ON sightings (relay);
      CREATE TABLE IF NOT EXISTS relays (url TEXT PRIMARY KEY, state TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
  }

  /**
   * Store manifests served by one relay. Already-known events only gain a sighting.
   * @param events Verified manifest events.
   * @param relay Relay that served them.
   * @param now Unix seconds.
   * @returns How many events were new to the store.
   * @example store.putEvents(events, 'wss://relay.example', now)
   */
  putEvents(events: Event[], relay: string, now: number): number {
    const insert = this.db.prepare('INSERT OR IGNORE INTO events (id, kind, pubkey, created_at, napplet, json, first_seen) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const sight = this.db.prepare('INSERT INTO sightings (event_id, relay, seen_at) VALUES (?, ?, ?) ON CONFLICT (event_id, relay) DO UPDATE SET seen_at = excluded.seen_at');
    let fresh = 0;
    this.db.exec('BEGIN');
    try {
      for (const event of events) {
        if (!(MANIFEST_KINDS as readonly number[]).includes(event.kind)) continue;
        const result = insert.run(event.id, event.kind, event.pubkey, event.created_at, nappletKey(event), JSON.stringify(event), now);
        if (Number(result.changes) > 0) fresh++;
        sight.run(event.id, relay, now);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return fresh;
  }

  /**
   * Distinct napplets a relay has ever served.
   * @param relay Relay URL.
   * @returns Count of distinct napplet keys.
   * @example store.nappletsOn('wss://relay.example')
   */
  nappletsOn(relay: string): number {
    const row = this.db.prepare('SELECT COUNT(DISTINCT e.napplet) AS n FROM sightings s JOIN events e ON e.id = s.event_id WHERE s.relay = ?').get(relay) as { n: number };
    return Number(row.n);
  }

  /**
   * Every stored manifest, oldest first.
   * @returns Signed events as received.
   * @example const events = store.allEvents();
   */
  allEvents(): Event[] {
    return (this.db.prepare('SELECT json FROM events ORDER BY created_at, id').all() as Array<{ json: string }>).map(row => JSON.parse(row.json) as Event);
  }

  /**
   * Relays that served each event, for relay hints in shareable addresses.
   * @returns Event id → relay URLs.
   * @example store.sightingsByEvent().get(id)
   */
  sightingsByEvent(): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const row of this.db.prepare('SELECT event_id, relay FROM sightings ORDER BY relay').all() as Array<{ event_id: string; relay: string }>) {
      const list = out.get(row.event_id) ?? [];
      list.push(row.relay);
      out.set(row.event_id, list);
    }
    return out;
  }

  /** @returns Number of stored manifests. @example store.eventCount() */
  eventCount(): number {
    return Number((this.db.prepare('SELECT COUNT(*) AS n FROM events').get() as { n: number }).n);
  }

  /** @returns All relay states by URL. @example store.relays().get(url) */
  relays(): Map<string, RelayState> {
    const out = new Map<string, RelayState>();
    for (const row of this.db.prepare('SELECT url, state FROM relays').all() as Array<{ url: string; state: string }>) {
      out.set(row.url, JSON.parse(row.state) as RelayState);
    }
    return out;
  }

  /** @param state Relay state to upsert. @example store.saveRelay(state) */
  saveRelay(state: RelayState): void {
    this.db.prepare('INSERT INTO relays (url, state) VALUES (?, ?) ON CONFLICT (url) DO UPDATE SET state = excluded.state').run(state.url, JSON.stringify(state));
  }

  /** @param states Relay states to upsert in one transaction. @example store.saveRelays(map.values()) */
  saveRelays(states: Iterable<RelayState>): void {
    this.db.exec('BEGIN');
    try {
      for (const state of states) this.saveRelay(state);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /** @param key Meta key. @returns Stored value. @example store.getMeta('lastBuildAt') */
  getMeta(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value;
  }

  /** @param key Meta key. @param value Value to store. @example store.setMeta('lastBuildAt', '1700000000') */
  setMeta(key: string, value: string): void {
    this.db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').run(key, value);
  }

  /** Close the database. @example store.close() */
  close(): void {
    this.db.close();
  }
}
