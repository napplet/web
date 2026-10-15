/**
 * Best-effort setup suggestions for interactive init.
 *
 * Relay suggestions remain advisory. Blossom suggestions deliberately use the
 * shared verified NIP-65 -> BUD-03 discovery service: without an author's
 * public key and a valid server list the CLI presents no server suggestion.
 *
 * @module
 */

import {
  discoverBlossomServers,
  type DiscoveryFilter,
  type DiscoveryServices,
} from "@napplet/build-tools";
import { SimplePool } from "nostr-tools/pool";

/** NIP-66 relay discovery event kind. */
export const NIP66_RELAY_DISCOVERY_KIND = 30166;
/** Maximum number of relay suggestions retained for terminal completion. */
export const DEFAULT_SUGGESTION_LIMIT = 1200;

/** Bounded NIP-66 relay discovery sources. */
export const DEFAULT_RELAY_DISCOVERY_RELAYS = [
  "wss://relaypag.es",
  "wss://relay.nostr.watch",
  "wss://monitorlizard.nostr1.com",
] as const;

/** Static relay suggestions retained when live NIP-66 discovery is unavailable. */
export const DEFAULT_RELAY_SUGGESTIONS = [
  "wss://relay.primal.net",
  "wss://nos.lol",
  "wss://relay.damus.io",
  "wss://nostr.wine",
  "wss://relay.nostr.band",
  "wss://nostr-pub.wellorder.net",
] as const;

interface QueryPool {
  querySync(
    relays: string[],
    filter: Record<string, unknown>,
    params?: { maxWait?: number; label?: string },
  ): Promise<unknown[]>;
  close?: (relays: string[]) => void;
  destroy?: () => void;
}

export interface SuggestionOptions {
  pool?: QueryPool;
  relays?: string[];
  limit?: number;
  maxWait?: number;
  pubkey?: string;
  verifyEvent?: DiscoveryServices["verifyEvent"];
  now?: () => number;
}

interface NostrEventLike {
  kind: number;
  created_at?: number;
  tags: string[][];
}

interface RelayCandidate {
  url: string;
  score: number;
  createdAt: number;
}

/** Resolve relay suggestions from NIP-66 discovery events with defaults appended. */
export async function getRelaySuggestions(options: SuggestionOptions = {}): Promise<string[]> {
  const limit = options.limit ?? DEFAULT_SUGGESTION_LIMIT;
  const defaults = [...DEFAULT_RELAY_SUGGESTIONS];
  const discovered = await querySuggestions(
    options,
    DEFAULT_RELAY_DISCOVERY_RELAYS,
    { kinds: [NIP66_RELAY_DISCOVERY_KIND], limit },
    eventsToRelaySuggestions,
  );
  return unique([...defaults, ...discovered]).slice(0, limit);
}

/**
 * Resolve an author's ordered Blossom server list through verified NIP-65 data.
 *
 * @param options User public key plus Deno relay adapter test seams.
 * @returns Ordered BUD-03 server URLs, or an empty list when the user must choose manually.
 */
export async function getBlossomServerSuggestions(
  options: SuggestionOptions = {},
): Promise<string[]> {
  if (!options.pubkey) return [];
  const pool = options.pool ?? new SimplePool() as QueryPool;
  const directoryRelays = options.relays?.length ? options.relays : undefined;
  try {
    const result = await discoverBlossomServers({
      pubkey: options.pubkey,
      directoryRelays,
      now: options.now,
      maxRelays: options.limit,
    }, {
      query: (relays, filter, signal) => queryWithPool(pool, relays, filter, signal, options),
      verifyEvent: options.verifyEvent,
    });
    return result.status === "found" ? result.servers.map((server) => server.toString()) : [];
  } catch {
    return [];
  } finally {
    if (!options.pool) closePool(pool, directoryRelays ?? []);
  }
}

/** Convert untrusted NIP-66 events into scored relay completion candidates. */
export function eventsToRelaySuggestions(events: readonly unknown[]): string[] {
  const latest = new Map<string, RelayCandidate>();
  for (const event of events) {
    const parsed = asEvent(event, NIP66_RELAY_DISCOVERY_KIND);
    if (!parsed) continue;
    const url = normalizeUrl(firstTagValue(parsed.tags, "d"));
    if (!url || !isRelayUrl(url)) continue;
    const candidate: RelayCandidate = { url, score: scoreRelay(parsed), createdAt: parsed.created_at ?? 0 };
    const existing = latest.get(url);
    if (!existing || candidate.score < existing.score ||
      (candidate.score === existing.score && candidate.createdAt > existing.createdAt)) {
      latest.set(url, candidate);
    }
  }
  return [...latest.values()]
    .sort((a, b) => a.score - b.score || b.createdAt - a.createdAt || a.url.localeCompare(b.url))
    .map((candidate) => candidate.url);
}

async function queryWithPool(
  pool: QueryPool,
  relays: readonly string[],
  filter: DiscoveryFilter,
  signal: AbortSignal,
  options: SuggestionOptions,
): Promise<readonly unknown[]> {
  if (signal.aborted) throw new Error("cancelled");
  return await pool.querySync([...relays], { ...filter }, {
    maxWait: options.maxWait ?? 1500,
    label: "napplet-init-suggestions",
  });
}

async function querySuggestions(
  options: SuggestionOptions,
  fallbackRelays: readonly string[],
  filter: Record<string, unknown>,
  parse: (events: readonly unknown[]) => string[],
): Promise<string[]> {
  const relays = options.relays?.length ? options.relays : [...fallbackRelays];
  const pool = options.pool ?? new SimplePool() as QueryPool;
  try {
    const events = await pool.querySync(relays, filter, {
      maxWait: options.maxWait ?? 1500,
      label: "napplet-init-suggestions",
    });
    return parse(events);
  } catch {
    return [];
  } finally {
    if (!options.pool) closePool(pool, relays);
  }
}

function closePool(pool: QueryPool, relays: readonly string[]): void {
  try { pool.close?.([...relays]); } catch { /* best-effort */ }
  try { pool.destroy?.(); } catch { /* best-effort */ }
}

function asEvent(value: unknown, kind: number): NostrEventLike | null {
  if (!value || typeof value !== "object") return null;
  const event = value as Partial<NostrEventLike>;
  if (event.kind !== kind || !Array.isArray(event.tags)) return null;
  const tags: string[][] = [];
  for (const tag of event.tags) {
    if (!Array.isArray(tag) || tag.some((part) => typeof part !== "string")) continue;
    tags.push([...tag]);
  }
  return { kind, created_at: typeof event.created_at === "number" ? event.created_at : undefined, tags };
}

function scoreRelay(event: NostrEventLike): number {
  let score = firstNumberTag(event.tags, "rtt-open") ?? firstNumberTag(event.tags, "rtt-read") ?? 10_000;
  if (firstTagValue(event.tags, "d")?.startsWith("wss://")) score -= 100;
  const requirements = event.tags.filter((tag) => tag[0] === "R").map((tag) => tag[1]);
  if (requirements.includes("payment")) score += 1000;
  if (requirements.includes("auth")) score += 500;
  if (requirements.includes("!payment")) score -= 50;
  if (requirements.includes("!auth")) score -= 25;
  return score;
}

function firstTagValue(tags: readonly string[][], name: string): string | undefined {
  return tags.find((tag) => tag[0] === name)?.[1];
}

function firstNumberTag(tags: readonly string[][], name: string): number | undefined {
  const raw = firstTagValue(tags, name);
  const value = raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function normalizeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    url.hash = "";
    url.search = "";
    const normalized = url.toString();
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  } catch { return null; }
}

function isRelayUrl(value: string): boolean {
  return value.startsWith("wss://") || value.startsWith("ws://");
}

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => !seen.has(value) && (seen.add(value), true));
}
