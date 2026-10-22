/**
 * Verified two-stage NIP-65 and BUD-03 Blossom server discovery.
 *
 * NIP-65 write or unmarked relays locate authored events. The resulting relay
 * URLs are never interpreted as Blossom servers.
 */

import { verifyEvent } from "nostr-tools/pure";
import type { SafeStatus, SignedEvent } from "./contracts.ts";

/** Directory relays used only to locate an author's kind-10002 relay list. */
export const DEFAULT_DIRECTORY_RELAYS = [
  "wss://purplepag.es",
  "wss://relay.damus.io",
  "wss://nos.lol",
] as const;

const RELAY_LIST_KIND = 10_002;
const SERVER_LIST_KIND = 10_063;
const DEFAULT_MAX_RELAYS = 16;
const DEFAULT_MAX_EVENTS = 64;
const DEFAULT_EVENT_AGE_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_FUTURE_SKEW_SECONDS = 5 * 60;

/** The verified Nostr event selected at one discovery stage. */
export type VerifiedEvent = SignedEvent;

/** Filter passed to the injected Nostr relay query adapter. */
export interface DiscoveryFilter {
  /** Kinds accepted for this stage. */
  kinds: readonly number[];
  /** Author required for this stage. */
  authors: readonly string[];
  /** Bounded maximum number of candidate events. */
  limit: number;
}

/** Nostr relay query capability injected by a Node or Deno adapter. */
export interface DiscoveryServices {
  /**
   * Query a bounded relay set and return untrusted event candidates.
   *
   * @param relays - Normalized websocket relay URLs.
   * @param filter - Exact authored kind filter for the stage.
   * @param signal - Cancels the query.
   * @returns Untrusted candidate events for local verification.
   */
  query(relays: readonly string[], filter: DiscoveryFilter, signal: AbortSignal): Promise<readonly unknown[]>;
  /** Optional verifier override for deterministic runtime adapters and tests. */
  verifyEvent?(event: unknown): boolean;
}

/** Bounded inputs for two-stage Blossom server discovery. */
export interface BlossomDiscoveryInput {
  /** The 64-character lowercase public key whose authored events are requested. */
  pubkey: string;
  /** Optional bounded public-directory set; defaults include wss://purplepag.es. */
  directoryRelays?: readonly string[];
  /** Deterministic clock used to reject stale or implausibly future events. */
  now?: () => number;
  /** Maximum accepted event age in seconds; defaults to 30 days. */
  maxEventAgeSeconds?: number;
  /** Maximum allowed future clock skew in seconds; defaults to five minutes. */
  maxFutureSkewSeconds?: number;
  /** Maximum relays queried at either stage; defaults to 16. */
  maxRelays?: number;
  /** Maximum candidates considered per stage; defaults to 64. */
  maxEvents?: number;
  /** Optional cancellation signal for both relay queries. */
  signal?: AbortSignal;
}

/** A verified ordered server list or an explicit reason no list is usable. */
export type BlossomDiscoveryResult =
  | { status: "found"; servers: URL[]; sourceEvent: VerifiedEvent }
  | { status: "no-server-list"; reason: SafeStatus };

/**
 * Discover an author's ordered Blossom servers through verified NIP-65 write relays.
 *
 * @param input - Public key, bounded directory relays, and event-validity bounds.
 * @param services - Injected relay query and optional signature-verification services.
 * @returns Ordered BUD-03 server URLs or an explicit, redaction-safe no-list outcome.
 * @example
 * ```ts
 * const result = await discoverBlossomServers({ pubkey }, { query });
 * if (result.status === "found") console.log(result.servers[0]);
 * ```
 */
export async function discoverBlossomServers(
  input: BlossomDiscoveryInput,
  services: DiscoveryServices,
): Promise<BlossomDiscoveryResult> {
  const signal = input.signal ?? new AbortController().signal;
  if (!PUBLIC_KEY_PATTERN.test(input.pubkey)) return noServerList("invalid-pubkey", "No verified Blossom server list is available");
  if (signal.aborted) return noServerList("cancelled", "Blossom server discovery was cancelled");

  const maxRelays = bounded(input.maxRelays, DEFAULT_MAX_RELAYS);
  const maxEvents = bounded(input.maxEvents, DEFAULT_MAX_EVENTS);
  const directoryRelays = normalizeRelays(input.directoryRelays ?? DEFAULT_DIRECTORY_RELAYS, maxRelays);
  if (directoryRelays.length === 0) return noServerList("no-directory-relays", "No verified Blossom server list is available");

  const now = (input.now ?? unixNow)();
  const validity = { now, maxAge: input.maxEventAgeSeconds ?? DEFAULT_EVENT_AGE_SECONDS, futureSkew: input.maxFutureSkewSeconds ?? DEFAULT_FUTURE_SKEW_SECONDS };
  let relayCandidates: readonly unknown[];
  try {
    relayCandidates = await services.query(directoryRelays, {
      kinds: [RELAY_LIST_KIND], authors: [input.pubkey], limit: maxEvents,
    }, signal);
  } catch {
    return noServerList("directory-query-failed", "No verified Blossom server list is available");
  }
  const relayList = newestVerified(relayCandidates, input.pubkey, RELAY_LIST_KIND, validity, services, maxEvents);
  if (!relayList) return noServerList("no-relay-list", "No verified Blossom server list is available");

  const authorRelays = writeRelays(relayList.tags, maxRelays);
  if (authorRelays.length === 0) return noServerList("no-write-relays", "No verified Blossom server list is available");
  let serverCandidates: readonly unknown[];
  try {
    serverCandidates = await services.query(authorRelays, {
      kinds: [SERVER_LIST_KIND], authors: [input.pubkey], limit: maxEvents,
    }, signal);
  } catch {
    return noServerList("server-list-query-failed", "No verified Blossom server list is available");
  }
  const serverList = newestVerified(serverCandidates, input.pubkey, SERVER_LIST_KIND, validity, services, maxEvents);
  if (!serverList) return noServerList("no-server-list", "No verified Blossom server list is available");
  const servers = serverUrls(serverList.tags, maxRelays);
  return servers.length > 0
    ? { status: "found", servers, sourceEvent: serverList }
    : noServerList("no-server-list", "No verified Blossom server list is available");
}

const PUBLIC_KEY_PATTERN = /^[0-9a-f]{64}$/;

function newestVerified(
  candidates: readonly unknown[],
  pubkey: string,
  kind: number,
  validity: { now: number; maxAge: number; futureSkew: number },
  services: DiscoveryServices,
  maxEvents: number,
): VerifiedEvent | undefined {
  let newest: VerifiedEvent | undefined;
  for (const candidate of candidates.slice(0, maxEvents)) {
    const event = verifiedEvent(candidate, pubkey, kind, validity, services);
    if (!event) continue;
    if (!newest || event.created_at > newest.created_at ||
      (event.created_at === newest.created_at && event.id > newest.id)) {
      newest = event;
    }
  }
  return newest;
}

function verifiedEvent(
  value: unknown,
  pubkey: string,
  kind: number,
  validity: { now: number; maxAge: number; futureSkew: number },
  services: DiscoveryServices,
): VerifiedEvent | undefined {
  if (!isSignedEvent(value) || value.kind !== kind || value.pubkey !== pubkey ||
    value.created_at < validity.now - validity.maxAge || value.created_at > validity.now + validity.futureSkew) return undefined;
  const event: VerifiedEvent = {
    id: value.id,
    pubkey: value.pubkey,
    sig: value.sig,
    kind: value.kind,
    created_at: value.created_at,
    content: value.content,
    tags: value.tags.map((tag) => [...tag]),
  };
  try {
    return (services.verifyEvent ?? verifyEvent)(event) ? event : undefined;
  } catch {
    return undefined;
  }
}

function isSignedEvent(value: unknown): value is VerifiedEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<VerifiedEvent>;
  return typeof event.id === "string" && typeof event.pubkey === "string" && typeof event.sig === "string" &&
    typeof event.kind === "number" && typeof event.created_at === "number" && typeof event.content === "string" &&
    Array.isArray(event.tags) && event.tags.every((tag) => Array.isArray(tag) && tag.every((part) => typeof part === "string"));
}

function writeRelays(tags: readonly string[][], maxRelays: number): string[] {
  const values: string[] = [];
  for (const tag of tags) {
    if (tag[0] !== "r" || (tag[2] !== undefined && tag[2] !== "write")) continue;
    const relay = normalizeRelay(tag[1]);
    if (relay && !values.includes(relay)) values.push(relay);
    if (values.length === maxRelays) break;
  }
  return values;
}

function normalizeRelays(values: readonly string[], maxRelays: number): string[] {
  const normalized: string[] = [];
  for (const value of values) {
    const relay = normalizeRelay(value);
    if (relay && !normalized.includes(relay)) normalized.push(relay);
    if (normalized.length === maxRelays) break;
  }
  return normalized;
}

function normalizeRelay(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "wss:" || url.username || url.password || url.search || url.hash) return undefined;
    // NIP-65 relay URLs can legitimately include a websocket path. Preserve
    // it while keeping root relay normalization compatible with existing URLs.
    return url.pathname === "/" ? url.origin : url.toString();
  } catch {
    return undefined;
  }
}

function serverUrls(tags: readonly string[][], maxServers: number): URL[] {
  const servers: URL[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    if (tag[0] !== "server" || !tag[1]) continue;
    try {
      const url = new URL(tag[1]);
      if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password || url.search || url.hash) continue;
      const key = url.toString();
      if (!seen.has(key)) {
        seen.add(key);
        servers.push(url);
      }
      if (servers.length === maxServers) break;
    } catch { /* invalid server tags are not usable */ }
  }
  return servers;
}

function bounded(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && value! > 0 ? Math.min(value!, fallback) : fallback;
}

function noServerList(code: string, message: string): BlossomDiscoveryResult {
  return { status: "no-server-list", reason: { code, message } };
}

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}
