/**
 * @napplet/nub/identity -- SDK helpers wrapping window.napplet.identity.
 *
 * These convenience functions delegate to `window.napplet.identity.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal, NostrEvent, Rumor } from '@napplet/core';
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
 * import { identityGetPublicKey } from '@napplet/nub/identity';
 *
 * const pubkey = await identityGetPublicKey();
 * ```
 */
export function identityGetPublicKey(): Promise<string> {
  return requireIdentity().getPublicKey();
}

/**
 * Get the user's relay list (NIP-65).
 *
 * @returns Record mapping relay URLs to read/write permissions
 *
 * @example
 * ```ts
 * import { identityGetRelays } from '@napplet/nub/identity';
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
 * import { identityGetProfile } from '@napplet/nub/identity';
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
 * import { identityGetFollows } from '@napplet/nub/identity';
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
 * import { identityGetList } from '@napplet/nub/identity';
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
 * import { identityGetZaps } from '@napplet/nub/identity';
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
 * import { identityGetMutes } from '@napplet/nub/identity';
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
 * import { identityGetBlocked } from '@napplet/nub/identity';
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
 * import { identityGetBadges } from '@napplet/nub/identity';
 *
 * const badges = await identityGetBadges();
 * ```
 */
export function identityGetBadges(): Promise<Badge[]> {
  return requireIdentity().getBadges();
}

/**
 * Decrypt a received Nostr event (NIP-04 / direct NIP-44 / NIP-17 gift-wrap).
 *
 * Shape auto-detected by the shell; napplets do NOT select encryption mode.
 * Only legal for napplets assigned class: 1 per NUB-CLASS-1 (shell-enforced).
 *
 * @param event  The received event (outer wrap for NIP-17, kind-4 for NIP-04, etc.)
 * @returns Promise resolving to { rumor, sender }; rejects with Error carrying
 *   an IdentityDecryptErrorCode as message on failure.
 *
 * @example
 * ```ts
 * import { identityDecrypt } from '@napplet/nub/identity';
 *
 * const { rumor, sender } = await identityDecrypt(wrappedEvent);
 * console.log(`Message from ${sender}: ${rumor.content}`);
 * ```
 */
export function identityDecrypt(event: NostrEvent): Promise<{ rumor: Rumor; sender: string }> {
  return requireIdentity().decrypt(event);
}
