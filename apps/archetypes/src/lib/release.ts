/** Presentation-only reader for NIP-5D manifests (nostr-protocol/nips#2303, Manifest section); not a conformance validator. */

import type { Event } from 'nostr-tools/pure';

/** A signed Nostr event as relays deliver it. */
export type NostrEvent = Event;

/** NIP-5D manifest kinds: snapshot, root, named. */
export const MANIFEST_KINDS = [5129, 15129, 35129] as const;

export interface Intent {
  /** Queryless convention identity, `napplet:<archetype>/<verb>`. */
  uri: string;
  archetype: string;
  verb: string;
  /** Advertised parameter names, in tag order. */
  params: string[];
}

export interface Release {
  /** Stable napplet key: the event id for a snapshot, the address otherwise. */
  key: string;
  id: string;
  kind: number;
  pubkey: string;
  createdAt: number;
  /** `d` identifier for named napplets. */
  identifier: string;
  title: string;
  description: string;
  archetypes: string[];
  intents: Intent[];
  requires: string[];
  optional: string[];
  /** Snapshot lineage (`a` parent, `A` root) as `kind:pubkey:d` coordinates. */
  parent?: string;
  root?: string;
  relays: string[];
  /** `z` and `i` values this site cannot route (e.g. `Note`, `napplet:note/open?x=1`), kept so they can be counted. */
  irregular: Array<{ tag: 'z' | 'i'; value: string }>;
}

/** Archetype and verb spelling this site can route to. Other spellings are counted, not shown. */
export const SLUG = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const PARAM = /^[A-Za-z0-9._-]{1,64}$/;
const DOMAIN = /^[a-z][a-z0-9-]{0,31}$/;

const unique = <T>(values: T[]) => [...new Set(values)];

/**
 * Parse a convention URI into archetype and verb. Queries and fragments are not part of an intent identity.
 * @param uri Candidate `napplet:<archetype>/<verb>` string.
 * @returns The parts, or null when the value is not a routable queryless identity.
 * @example parseIntentUri('napplet:note/open') // { archetype: 'note', verb: 'open' }
 */
export function parseIntentUri(uri: string): { archetype: string; verb: string } | null {
  const match = /^napplet:([^/?#\s]+)\/([^/?#\s]+)$/.exec(uri);
  if (!match || !SLUG.test(match[1]) || !SLUG.test(match[2])) return null;
  return { archetype: match[1], verb: match[2] };
}

function coordinate(tag: string[] | undefined): string | undefined {
  const value = tag?.[1];
  if (!value) return undefined;
  const [kind, pubkey, ...rest] = value.split(':');
  if (!['15129', '35129'].includes(kind) || !HEX64.test(pubkey ?? '')) return undefined;
  return `${kind}:${pubkey}:${rest.join(':')}`;
}

/**
 * Napplet key: the event id for a snapshot, the replaceable address otherwise.
 * @param event Manifest event.
 * @returns Key string.
 * @example releaseKey(event) // '35129:<pubkey>:notes'
 */
export function releaseKey(event: Pick<NostrEvent, 'id' | 'kind' | 'pubkey' | 'tags'>): string {
  if (event.kind === 5129) return event.id;
  const d = event.kind === 35129 ? event.tags.find(tag => tag[0] === 'd')?.[1] ?? '' : '';
  return `${event.kind}:${event.pubkey}:${d}`;
}

/**
 * Read a manifest's display and archetype fields. Signatures are checked before events reach this function.
 * @param event Manifest event.
 * @param relays Relays known to serve it.
 * @returns The release, or null when the event is not a current-format manifest.
 * @example parseRelease(event, ['wss://relay.example'])
 */
export function parseRelease(event: NostrEvent, relays: string[] = []): Release | null {
  if (!(MANIFEST_KINDS as readonly number[]).includes(event.kind)) return null;
  if (typeof event.content !== 'string' || !event.content.trim()) return null;
  if (!Array.isArray(event.tags) || event.tags.some(tag => !Array.isArray(tag) || tag.some(value => typeof value !== 'string'))) return null;
  const x = event.tags.filter(tag => tag[0] === 'x');
  if (x.length !== 1 || x[0].length !== 2 || !HEX64.test(x[0][1])) return null;
  const d = event.tags.filter(tag => tag[0] === 'd');
  if (event.kind === 35129 ? d.length !== 1 || !d[0][1] : d.length !== 0) return null;
  if (!Number.isSafeInteger(event.created_at) || event.created_at < 0) return null;

  const archetypes = unique(event.tags.filter(tag => tag[0] === 'z' && SLUG.test(tag[1] ?? '')).map(tag => tag[1])).slice(0, 32);
  const irregular: Release['irregular'] = [
    ...unique(event.tags.filter(tag => tag[0] === 'z' && tag[1] && !SLUG.test(tag[1])).map(tag => tag[1])).map(value => ({ tag: 'z' as const, value })),
    ...unique(event.tags.filter(tag => tag[0] === 'i' && tag[1] && !parseIntentUri(tag[1])).map(tag => tag[1])).map(value => ({ tag: 'i' as const, value })),
  ].map(entry => ({ ...entry, value: entry.value.slice(0, 120) })).slice(0, 32);
  const intents: Intent[] = [];
  const seen = new Set<string>();
  for (const tag of event.tags) {
    if (tag[0] !== 'i' || !tag[1]) continue;
    const parts = parseIntentUri(tag[1]);
    if (!parts || seen.has(tag[1])) continue;
    seen.add(tag[1]);
    intents.push({ uri: tag[1], ...parts, params: unique(tag.slice(2).filter(param => PARAM.test(param))).slice(0, 32) });
    if (intents.length >= 64) break;
  }
  const domains = (name: string) => unique(event.tags.filter(tag => tag[0] === name && DOMAIN.test(tag[1] ?? '')).map(tag => tag[1]));
  const identifier = event.kind === 35129 ? d[0][1] : '';
  const title = event.tags.find(tag => tag[0] === 'title')?.[1]?.trim();
  return {
    key: releaseKey(event),
    id: event.id,
    kind: event.kind,
    pubkey: event.pubkey,
    createdAt: event.created_at,
    identifier,
    title: (title || identifier || `Napplet ${event.id.slice(0, 8)}`).slice(0, 100),
    description: event.content.trim().slice(0, 1200),
    archetypes,
    intents,
    requires: domains('R'),
    optional: domains('O'),
    ...(event.kind === 5129 ? {
      ...(coordinate(event.tags.find(tag => tag[0] === 'a')) ? { parent: coordinate(event.tags.find(tag => tag[0] === 'a')) } : {}),
      ...(coordinate(event.tags.find(tag => tag[0] === 'A')) ? { root: coordinate(event.tags.find(tag => tag[0] === 'A')) } : {}),
    } : {}),
    relays: unique(relays).slice(0, 3),
    irregular,
  };
}
