// ─── Display helpers ────────────────────────────────────────────────────────

import { naddrEncode, neventEncode, npubEncode } from 'nostr-tools/nip19';
import type { NappletRef, Status } from './model';

/** @param seconds Unix seconds. @returns `YYYY-MM-DD` in UTC. @example day(0) // '1970-01-01' */
export const day = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10);

/** @param seconds Unix seconds. @returns `YYYY-MM-DD HH:MM UTC`. @example stamp(0) */
export const stamp = (seconds: number) => `${new Date(seconds * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC`;

/**
 * Short publisher label from a hex key.
 * @param pubkey Hex public key.
 * @returns `npub1abcd…wxyz`.
 * @example shortNpub(pubkey)
 */
export function shortNpub(pubkey: string): string {
  try {
    const npub = npubEncode(pubkey);
    return `${npub.slice(0, 9)}…${npub.slice(-4)}`;
  } catch { return `${pubkey.slice(0, 8)}…`; }
}

/**
 * NIP-19 pointer for a napplet: `naddr` for root and named napplets, `nevent` for snapshots.
 * @param napplet Napplet reference.
 * @returns Bech32 pointer with relay hints.
 * @example pointer(napplet) // 'naddr1…'
 */
export function pointer(napplet: Pick<NappletRef, 'id' | 'kind' | 'pubkey' | 'identifier' | 'relays'>): string {
  return napplet.kind === 5129
    ? neventEncode({ id: napplet.id, author: napplet.pubkey, kind: napplet.kind, relays: napplet.relays })
    : naddrEncode({ kind: napplet.kind, pubkey: napplet.pubkey, identifier: napplet.identifier, relays: napplet.relays });
}

/** @param kind Manifest kind. @returns Human label. @example kindLabel(35129) // 'named' */
export const kindLabel = (kind: number) => ({ 5129: 'snapshot', 15129: 'root', 35129: 'named' } as Record<number, string>)[kind] ?? String(kind);

export const STATUS_LABEL: Record<Status | 'coalesce' | 'distinct', string> = {
  observed: 'observed',
  candidate: 'synonym candidate',
  coalesced: 'coalesced',
  coalesce: 'coalesced',
  diverse: 'diverse by design',
  distinct: 'kept distinct',
};

/** @param n Count. @param word Singular noun. @returns `1 napplet` / `2 napplets`. @example plural(2, 'napplet') */
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** @param uri Intent URI. @returns Site path for its detail page. @example intentPath('napplet:note/open') // '/intents/note/open/' */
export function intentPath(uri: string): string {
  const [archetype, verb] = uri.slice('napplet:'.length).split('/');
  return `/intents/${archetype}/${verb}/`;
}

/** @param text Plain text. @param max Length. @returns Text cut at a word boundary with an ellipsis. @example clip('long text', 4) */
export function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).trimEnd()}…`;
}
