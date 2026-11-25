import { finalizeEvent, generateSecretKey } from 'nostr-tools/pure';
import type { NostrEvent } from '../lib/release';

export const alice = generateSecretKey();
export const bob = generateSecretKey();
export const carol = generateSecretKey();
const X = ['x', 'b'.repeat(64)];

/** A signed named manifest (kind 35129). */
export function named(d: string, tags: string[][], opts: { at?: number; sk?: Uint8Array; content?: string; title?: string } = {}): NostrEvent {
  return finalizeEvent({ kind: 35129, created_at: opts.at ?? 1000, content: opts.content ?? `${d} napplet`, tags: [['d', d], X, ...(opts.title ? [['title', opts.title]] : []), ...tags] }, opts.sk ?? alice) as NostrEvent;
}

/** A signed snapshot manifest (kind 5129). */
export function snapshot(tags: string[][], opts: { at?: number; sk?: Uint8Array; content?: string; title?: string } = {}): NostrEvent {
  return finalizeEvent({ kind: 5129, created_at: opts.at ?? 1000, content: opts.content ?? 'snapshot napplet', tags: [X, ...(opts.title ? [['title', opts.title]] : []), ...tags] }, opts.sk ?? alice) as NostrEvent;
}
