/**
 * @napplet/nap/identity -- SDK helpers wrapping window.napplet.identity.
 *
 * These convenience functions delegate to `window.napplet.identity.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal, Subscription } from '@napplet/core';
import type { ProfileData, ZapReceipt, Badge, RelayPermission } from './types.js';

function requireIdentity(): NappletGlobal['identity'] {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.identity) {
    throw new Error('window.napplet.identity not installed -- import @napplet/shim first');
  }
  return w.napplet.identity;
}

/**
 * Get the user's hex-encoded public key.
 *
 * @returns Hex-encoded public key string
 *
 * @example
 * ```ts
 * import { identityGetPublicKey } from '@napplet/nap/identity';
 *
 * const pubkey = await identityGetPublicKey();
 * ```
 */
export function identityGetPublicKey(): Promise<string> {
  return requireIdentity().getPublicKey();
}

/**
 * Listen for shell-pushed user identity changes.
 *
 * @returns Subscription with close() to detach the handler
 *
 * @example
 * ```ts
 * import { identityOnChanged } from '@napplet/nap/identity';
 *
 * const sub = identityOnChanged((pubkey) => {
 *   console.log(pubkey || 'signed out');
 * });
 * ```
 */
export function identityOnChanged(handler: (pubkey: string) => void): Subscription {
  return requireIdentity().onChanged(handler);
}

/**
 * Get the user's relay list (NIP-65).
 *
 * @returns Record mapping relay URLs to read/write permissions
 *
 * @example
 * ```ts
 * import { identityGetRelays } from '@napplet/nap/identity';
 *
 * const relays = await identityGetRelays();
 * ```
 */
export function identityGetRelays(): Promise<Record<string, RelayPermission>> {
  return requireIdentity().getRelays();
}

/**
 * Get the user's profile metadata (kind 0).
 *
 * @returns Profile data, or null if no profile found
 *
 * @example
 * ```ts
 * import { identityGetProfile } from '@napplet/nap/identity';
 *
 * const profile = await identityGetProfile();
 * if (profile) console.log(profile.name);
 * ```
 */
export function identityGetProfile(): Promise<ProfileData | null> {
  return requireIdentity().getProfile();
}

/**
 * Get the user's follow list (kind 3 contact list).
 *
 * @returns Array of hex-encoded public keys
 *
 * @example
 * ```ts
 * import { identityGetFollows } from '@napplet/nap/identity';
 *
 * const follows = await identityGetFollows();
 * ```
 */
export function identityGetFollows(): Promise<string[]> {
  return requireIdentity().getFollows();
}

/**
 * Get entries from a user's categorized list.
 *
 * @param listType  List category (e.g., "bookmarks", "interests", "pins")
 * @returns Array of list entry values
 *
 * @example
 * ```ts
 * import { identityGetList } from '@napplet/nap/identity';
 *
 * const bookmarks = await identityGetList('bookmarks');
 * ```
 */
export function identityGetList(listType: string): Promise<string[]> {
  return requireIdentity().getList(listType);
}

/**
 * Get zap receipts sent to the user.
 *
 * @returns Array of zap receipt objects
 *
 * @example
 * ```ts
 * import { identityGetZaps } from '@napplet/nap/identity';
 *
 * const zaps = await identityGetZaps();
 * ```
 */
export function identityGetZaps(): Promise<ZapReceipt[]> {
  return requireIdentity().getZaps();
}

/**
 * Get the user's mute list (kind 10000).
 *
 * @returns Array of hex-encoded muted public keys
 *
 * @example
 * ```ts
 * import { identityGetMutes } from '@napplet/nap/identity';
 *
 * const mutes = await identityGetMutes();
 * ```
 */
export function identityGetMutes(): Promise<string[]> {
  return requireIdentity().getMutes();
}

/**
 * Get the user's block list.
 *
 * @returns Array of hex-encoded blocked public keys
 *
 * @example
 * ```ts
 * import { identityGetBlocked } from '@napplet/nap/identity';
 *
 * const blocked = await identityGetBlocked();
 * ```
 */
export function identityGetBlocked(): Promise<string[]> {
  return requireIdentity().getBlocked();
}

/**
 * Get badges awarded to the user (NIP-58).
 *
 * @returns Array of badge objects
 *
 * @example
 * ```ts
 * import { identityGetBadges } from '@napplet/nap/identity';
 *
 * const badges = await identityGetBadges();
 * ```
 */
export function identityGetBadges(): Promise<Badge[]> {
  return requireIdentity().getBadges();
}
