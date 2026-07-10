/**
 * Best-effort setup suggestions for interactive init.
 *
 * NIP-66 relay discovery and BUD-03/NIP-B7 Blossom server lists are advisory
 * inputs only. Absence of live suggestion data must never block init.
 *
 * @module
 */

import { SimplePool } from "nostr-tools/pool";

export const NIP66_RELAY_DISCOVERY_KIND = 30166;
export const BLOSSOM_SERVER_LIST_KIND = 10063;

export const DEFAULT_RELAY_DISCOVERY_RELAYS = [
  "wss://relaypag.es",
  "wss://relay.nostr.watch",
  "wss://monitorlizard.nostr1.com",
] as const;

export const DEFAULT_RELAY_SUGGESTIONS = [
  "wss://relay.primal.net",
  "wss://nos.lol",
  "wss://relay.damus.io",
  "wss://nostr.wine",
  "wss://relay.nostr.band",
  "wss://nostr-pub.wellorder.net",
] as const;

export const DEFAULT_BLOSSOM_SERVER_SUGGESTIONS = [
  "https://cdn.hzrd149.com",
  "https://cdn.sovbit.host",
  "https://cdn.nostrcheck.me",
  "https://nostr.download",
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

interface SuggestionOptions {
  pool?: QueryPool;
  relays?: string[];
  limit?: number;
  maxWait?: number;
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

/**
 * Resolve relay suggestions from NIP-66 discovery events with defaults appended.
 *
 * @param options Optional pool, relays, and timeout for tests or callers.
 * @returns Unique relay URLs ordered by live discovery score, then defaults.
 * @example
 * ```ts
 * const relays = await getRelaySuggestions();
 * ```
 */
export async function getRelaySuggestions(options: SuggestionOptions = {}): Promise<string[]> {
  const defaults = [...DEFAULT_RELAY_SUGGESTIONS];
  const discovered = await querySuggestions(
    options,
    DEFAULT_RELAY_DISCOVERY_RELAYS,
    { kinds: [NIP66_RELAY_DISCOVERY_KIND], limit: options.limit ?? 80 },
    eventsToRelaySuggestions,
  );
  return unique([...discovered, ...defaults]).slice(0, options.limit ?? 12);
}

/**
 * Resolve Blossom server suggestions from kind 10063 server-list events.
 *
 * @param options Optional pool, relays, and timeout for tests or callers.
 * @returns Unique Blossom server URLs ordered by observed frequency, then defaults.
 * @example
 * ```ts
 * const servers = await getBlossomServerSuggestions({ relays });
 * ```
 */
export async function getBlossomServerSuggestions(
  options: SuggestionOptions = {},
): Promise<string[]> {
  const defaults = [...DEFAULT_BLOSSOM_SERVER_SUGGESTIONS];
  const relays = options.relays?.length ? options.relays : DEFAULT_RELAY_SUGGESTIONS.slice(0, 4);
  const discovered = await querySuggestions(
    { ...options, relays },
    relays,
    { kinds: [BLOSSOM_SERVER_LIST_KIND], limit: options.limit ?? 80 },
    eventsToBlossomServerSuggestions,
  );
  return unique([...discovered, ...defaults]).slice(0, options.limit ?? 12);
}

export function eventsToRelaySuggestions(events: readonly unknown[]): string[] {
  const latest = new Map<string, RelayCandidate>();
  for (const event of events) {
    const parsed = asEvent(event, NIP66_RELAY_DISCOVERY_KIND);
    if (!parsed) continue;
    const url = normalizeUrl(firstTagValue(parsed.tags, "d"));
    if (!url || !isRelayUrl(url)) continue;
    const candidate: RelayCandidate = {
      url,
      score: scoreRelay(parsed),
      createdAt: parsed.created_at ?? 0,
    };
    const existing = latest.get(url);
    if (
      !existing || candidate.score < existing.score ||
      (candidate.score === existing.score && candidate.createdAt > existing.createdAt)
    ) {
      latest.set(url, candidate);
    }
  }
  return [...latest.values()]
    .sort((a, b) => a.score - b.score || b.createdAt - a.createdAt || a.url.localeCompare(b.url))
    .map((candidate) => candidate.url);
}

export function eventsToBlossomServerSuggestions(events: readonly unknown[]): string[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const parsed = asEvent(event, BLOSSOM_SERVER_LIST_KIND);
    if (!parsed) continue;
    for (const tag of parsed.tags) {
      if (tag[0] !== "server") continue;
      const url = normalizeUrl(tag[1]);
      if (!url || !isHttpUrl(url)) continue;
      counts.set(url, (counts.get(url) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([url]) => url);
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
    if (!options.pool) {
      try {
        pool.close?.(relays);
      } catch { /* best-effort */ }
      try {
        pool.destroy?.();
      } catch { /* best-effort */ }
    }
  }
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
  return {
    kind,
    created_at: typeof event.created_at === "number" ? event.created_at : undefined,
    tags,
  };
}

function scoreRelay(event: NostrEventLike): number {
  let score = firstNumberTag(event.tags, "rtt-open") ??
    firstNumberTag(event.tags, "rtt-read") ??
    10_000;
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
  if (raw === undefined) return undefined;
  const value = Number(raw);
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
  } catch {
    return null;
  }
}

function isRelayUrl(value: string): boolean {
  return value.startsWith("wss://") || value.startsWith("ws://");
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}
