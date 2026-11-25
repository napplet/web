import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCuration, type Curation } from './curation';
import { buildIndex, type SiteIndex } from './model';
import type { NostrEvent } from './release';

export interface Snapshot {
  version: 1;
  generatedAt: number;
  siteUrl: string;
  events: NostrEvent[];
  relayHints: Record<string, string[]>;
  runtime: { relays: string[]; timeoutMs: number };
  relays: Array<{ url: string; points: number; source: string; lastCheckAt?: number; nextCheckAt: number }>;
  stats: { tracked: number; withNapplets: number; removed: number };
}

export interface SiteData { snapshot: Snapshot; curation: Curation; index: SiteIndex }

/**
 * Check the snapshot's shape before anything renders from it.
 * @param raw Parsed JSON.
 * @returns The snapshot.
 * @example readSnapshot(JSON.parse(text))
 */
export function readSnapshot(raw: unknown): Snapshot {
  const value = raw as Partial<Snapshot>;
  if (!value || value.version !== 1) throw new Error('snapshot: unsupported version');
  if (!Array.isArray(value.events)) throw new Error('snapshot: events must be a list');
  if (!Number.isSafeInteger(value.generatedAt)) throw new Error('snapshot: generatedAt must be unix seconds');
  if (!value.runtime || !Array.isArray(value.runtime.relays)) throw new Error('snapshot: runtime.relays must be a list');
  const relays = value.runtime.relays.filter(url => typeof url === 'string' && /^wss:\/\/[^\s"'<>]+$/.test(url));
  return {
    version: 1,
    generatedAt: value.generatedAt as number,
    siteUrl: typeof value.siteUrl === 'string' && value.siteUrl.startsWith('https://') ? value.siteUrl : 'https://archetypes.napplet.run',
    events: value.events,
    relayHints: value.relayHints ?? {},
    runtime: { relays, timeoutMs: Number(value.runtime.timeoutMs) > 0 ? Number(value.runtime.timeoutMs) : 8000 },
    relays: Array.isArray(value.relays) ? value.relays : [],
    stats: value.stats ?? { tracked: 0, withNapplets: 0, removed: 0 },
  };
}

let cached: SiteData | undefined;

/**
 * Load the snapshot and curation once per build and index them.
 * @returns Snapshot, curation and index.
 * @example const { index } = loadSiteData();
 */
export function loadSiteData(): SiteData {
  if (cached) return cached;
  const snapshotPath = process.env.ARCHETYPES_SNAPSHOT || resolve(process.cwd(), 'src/data/snapshot.json');
  const curationPath = process.env.ARCHETYPES_CURATION || resolve(process.cwd(), 'curation.yaml');
  const snapshot = readSnapshot(JSON.parse(readFileSync(snapshotPath, 'utf8')));
  const curation = parseCuration(readFileSync(curationPath, 'utf8'));
  const index = buildIndex(snapshot.events, { relayHints: snapshot.relayHints, curation, generatedAt: snapshot.generatedAt });
  cached = { snapshot, curation, index };
  return cached;
}
