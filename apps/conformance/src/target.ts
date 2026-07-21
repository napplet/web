import {
  NAPPLET_KIND_NAMED,
  NAPPLET_MANIFEST_KINDS,
  validateManifestEvent,
  type NappletManifestEvent,
} from '@napplet/conformance';
import type { Event as NostrEvent } from 'nostr-tools/core';
import type { Filter } from 'nostr-tools/filter';
import { decodeNostrURI } from 'nostr-tools/nip19';
import { SimplePool } from 'nostr-tools/pool';
import { verifyEvent } from 'nostr-tools/pure';

const DEFAULT_RELAY_WAIT_MS = 8000;

export interface NappletPointer {
  type: 'nevent' | 'naddr';
  relays: string[];
  filter: Filter;
}

export interface ResolvedTarget {
  source: 'url' | 'nostr';
  input: string;
  label: string;
  bootUrl: string;
  html: string;
  fetched: boolean;
  manifestEvent: NappletManifestEvent | null;
  revoke?: () => void;
}

export interface ResolveTargetOptions {
  fetcher?: typeof fetch;
  pool?: Pick<SimplePool, 'get' | 'destroy'>;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  maxRelayWaitMs?: number;
}

function isNappletKind(kind: number | undefined): boolean {
  return typeof kind === 'number' && (NAPPLET_MANIFEST_KINDS as readonly number[]).includes(kind);
}

export function isHttpTarget(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeRelayHints(relays: readonly string[] | undefined): string[] {
  const normalized: string[] = [];
  for (const relay of relays ?? []) {
    try {
      const url = new URL(relay);
      if (url.protocol !== 'ws:' && url.protocol !== 'wss:') continue;
      normalized.push(url.href);
    } catch {
      // Ignore malformed relay hints. A pointer with no usable hints fails below.
    }
  }
  return [...new Set(normalized)];
}

export function decodeNappletPointer(input: string): NappletPointer {
  const decoded = decodeNostrURI(input.trim());
  if (decoded.type !== 'nevent' && decoded.type !== 'naddr') {
    throw new Error('Enter a NIP-19 nevent or naddr for a NIP-5D napplet manifest event');
  }

  const relays = normalizeRelayHints(decoded.data.relays);
  if (relays.length === 0) {
    throw new Error('The pointer does not include relay hints; include at least one relay in the nevent/naddr');
  }

  if (decoded.type === 'nevent') {
    if (decoded.data.kind !== undefined && !isNappletKind(decoded.data.kind)) {
      throw new Error(`nevent points at kind ${decoded.data.kind}, not a NIP-5D napplet manifest kind`);
    }
    return {
      type: 'nevent',
      relays,
      filter: {
        ids: [decoded.data.id],
        kinds: decoded.data.kind === undefined ? [...NAPPLET_MANIFEST_KINDS] : [decoded.data.kind],
        authors: decoded.data.author ? [decoded.data.author] : undefined,
        limit: 1,
      },
    };
  }

  if (decoded.data.kind !== NAPPLET_KIND_NAMED) {
    throw new Error(`naddr kind ${decoded.data.kind} is not the named napplet kind ${NAPPLET_KIND_NAMED}`);
  }
  return {
    type: 'naddr',
    relays,
    filter: {
      kinds: [NAPPLET_KIND_NAMED],
      authors: [decoded.data.pubkey],
      '#d': [decoded.data.identifier],
      limit: 1,
    },
  };
}

function asManifestEvent(event: NostrEvent): NappletManifestEvent {
  return {
    id: event.id,
    pubkey: event.pubkey,
    kind: event.kind,
    tags: event.tags,
  };
}

async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function pathTags(event: NappletManifestEvent): string[][] {
  return event.tags.filter((tag) => tag[0] === 'path' && typeof tag[1] === 'string' && typeof tag[2] === 'string');
}

export async function computeAggregateHash(event: NappletManifestEvent): Promise<string> {
  const lines = pathTags(event)
    .map((tag) => `${tag[2]} ${tag[1]}\n`)
    .sort()
    .join('');
  return sha256Hex(lines);
}

async function verifyAggregateHash(event: NappletManifestEvent): Promise<void> {
  const aggregate = await computeAggregateHash(event);
  for (const tag of event.tags.filter((candidate) => candidate[0] === 'x')) {
    if (tag[2] !== aggregate) {
      throw new Error(`Manifest x tag does not match recomputed aggregate hash ${aggregate}`);
    }
  }
}

function indexPathTag(event: NappletManifestEvent): string[] | undefined {
  return event.tags.find((tag) => tag[0] === 'path' && tag[1] === '/index.html');
}

function blossomServers(event: NappletManifestEvent): string[] {
  const servers: string[] = [];
  for (const tag of event.tags) {
    if (tag[0] !== 'server' || !tag[1]) continue;
    try {
      const url = new URL(tag[1]);
      if (url.protocol === 'http:' || url.protocol === 'https:') servers.push(url.href);
    } catch {
      // Ignore malformed server hints; a manifest with no usable servers fails below.
    }
  }
  return [...new Set(servers)];
}

function blobUrl(server: string, sha256: string): string {
  const base = server.endsWith('/') ? server : `${server}/`;
  return new URL(sha256, base).href;
}

export async function fetchIndexHtml(
  event: NappletManifestEvent,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const index = indexPathTag(event);
  const sha256 = index?.[2];
  if (!sha256) throw new Error('Manifest does not include a /index.html path hash');

  const servers = blossomServers(event);
  if (servers.length === 0) {
    throw new Error('Manifest does not include any usable Blossom server hints');
  }

  const errors: string[] = [];
  for (const server of servers) {
    const url = blobUrl(server, sha256);
    try {
      const response = await fetcher(url, { mode: 'cors' });
      if (!response.ok) {
        errors.push(`${url}: HTTP ${response.status}`);
        continue;
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      const actual = await sha256Hex(bytes);
      if (actual !== sha256) {
        errors.push(`${url}: sha256 ${actual} did not match manifest ${sha256}`);
        continue;
      }
      return new TextDecoder().decode(bytes);
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`Unable to fetch verified /index.html from Blossom servers: ${errors.join('; ')}`);
}

async function resolveUrlTarget(input: string, fetcher: typeof fetch): Promise<ResolvedTarget> {
  try {
    const response = await fetcher(input, { mode: 'cors' });
    const html = await response.text();
    return { source: 'url', input, label: input, bootUrl: input, html, fetched: true, manifestEvent: null };
  } catch {
    return { source: 'url', input, label: input, bootUrl: input, html: '', fetched: false, manifestEvent: null };
  }
}

async function resolveNostrTarget(input: string, options: ResolveTargetOptions): Promise<ResolvedTarget> {
  const pointer = decodeNappletPointer(input);
  const ownsPool = !options.pool;
  const pool = options.pool ?? new SimplePool();
  try {
    const event = await pool.get(pointer.relays, { ...pointer.filter }, {
      maxWait: options.maxRelayWaitMs ?? DEFAULT_RELAY_WAIT_MS,
    });
    if (!event) throw new Error('No matching napplet manifest event was found on the pointer relay hints');
    if (!verifyEvent(event)) throw new Error('Resolved manifest event signature is invalid');

    const manifestEvent = asManifestEvent(event);
    const verdict = validateManifestEvent(manifestEvent);
    if (!verdict.ok) {
      throw new Error(`Resolved event is not a valid NIP-5D napplet manifest: ${verdict.errors[0]?.message}`);
    }
    await verifyAggregateHash(manifestEvent);

    const html = await fetchIndexHtml(manifestEvent, options.fetcher ?? fetch);
    const bootUrl = (options.createObjectUrl ?? URL.createObjectURL)(new Blob([html], {
      type: 'text/html;charset=utf-8',
    }));
    const revoke = (): void => (options.revokeObjectUrl ?? URL.revokeObjectURL)(bootUrl);
    return {
      source: 'nostr',
      input,
      label: manifestEvent.id ?? input,
      bootUrl,
      html,
      fetched: true,
      manifestEvent,
      revoke,
    };
  } finally {
    if (ownsPool) pool.destroy();
  }
}

export async function resolveTarget(input: string, options: ResolveTargetOptions = {}): Promise<ResolvedTarget> {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Enter a NIP-19 nevent/naddr, or an HTTP URL for local dev');
  if (isHttpTarget(trimmed)) return resolveUrlTarget(trimmed, options.fetcher ?? fetch);
  return resolveNostrTarget(trimmed, options);
}
