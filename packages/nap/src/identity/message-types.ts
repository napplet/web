/**
 * @napplet/nap/identity -- Identity NAP wire message types.
 *
 * Defines identity query and push message types:
 * - Napplet -> Shell: getPublicKey, getRelays, getProfile, getFollows,
 *   getList, getZaps, getMutes, getBlocked, getBadges
 * - Shell -> Napplet: corresponding .result for each query
 * - Shell -> Napplet: identity.changed push notifications
 *
 * All types form a discriminated union on the `type` field.
 * All queries are strictly read-only -- no signing, encryption, or decryption.
 */

import type { NappletMessage } from '@napplet/core';
import type { ProfileData, ZapReceipt, Badge, RelayPermission } from './value-types.js';

/**
 * Base interface for all identity NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface IdentityMessage extends NappletMessage {
  /** Message type in "identity.<action>" format. */
  type: `identity.${string}`;
}

/**
 * Request the user's hex-encoded public key.
 *
 * @example
 * ```ts
 * const msg: IdentityGetPublicKeyMessage = {
 *   type: 'identity.getPublicKey',
 *   id: crypto.randomUUID(),
 * };
 * ```
 */
export interface IdentityGetPublicKeyMessage extends IdentityMessage {
  type: 'identity.getPublicKey';
  /** Correlation ID. */
  id: string;
}

/**
 * Request the user's relay list (NIP-65).
 *
 * @example
 * ```ts
 * const msg: IdentityGetRelaysMessage = {
 *   type: 'identity.getRelays',
 *   id: crypto.randomUUID(),
 * };
 * ```
 */
export interface IdentityGetRelaysMessage extends IdentityMessage {
  type: 'identity.getRelays';
  /** Correlation ID. */
  id: string;
}

/**
 * Request the user's profile metadata (kind 0).
 *
 * @example
 * ```ts
 * const msg: IdentityGetProfileMessage = {
 *   type: 'identity.getProfile',
 *   id: crypto.randomUUID(),
 * };
 * ```
 */
export interface IdentityGetProfileMessage extends IdentityMessage {
  type: 'identity.getProfile';
  /** Correlation ID. */
  id: string;
}

/**
 * Request the user's follow list (kind 3 contact list).
 *
 * @example
 * ```ts
 * const msg: IdentityGetFollowsMessage = {
 *   type: 'identity.getFollows',
 *   id: crypto.randomUUID(),
 * };
 * ```
 */
export interface IdentityGetFollowsMessage extends IdentityMessage {
  type: 'identity.getFollows';
  /** Correlation ID. */
  id: string;
}

/**
 * Request a categorized list by type.
 *
 * @example
 * ```ts
 * const msg: IdentityGetListMessage = {
 *   type: 'identity.getList',
 *   id: crypto.randomUUID(),
 *   listType: 'bookmarks',
 * };
 * ```
 */
export interface IdentityGetListMessage extends IdentityMessage {
  type: 'identity.getList';
  /** Correlation ID. */
  id: string;
  /** List category (e.g., "bookmarks", "interests", "pins"). */
  listType: string;
}

/**
 * Request zap receipts sent to the user.
 *
 * @example
 * ```ts
 * const msg: IdentityGetZapsMessage = {
 *   type: 'identity.getZaps',
 *   id: crypto.randomUUID(),
 * };
 * ```
 */
export interface IdentityGetZapsMessage extends IdentityMessage {
  type: 'identity.getZaps';
  /** Correlation ID. */
  id: string;
}

/**
 * Request the user's mute list (kind 10000).
 *
 * @example
 * ```ts
 * const msg: IdentityGetMutesMessage = {
 *   type: 'identity.getMutes',
 *   id: crypto.randomUUID(),
 * };
 * ```
 */
export interface IdentityGetMutesMessage extends IdentityMessage {
  type: 'identity.getMutes';
  /** Correlation ID. */
  id: string;
}

/**
 * Request the user's block list.
 *
 * @example
 * ```ts
 * const msg: IdentityGetBlockedMessage = {
 *   type: 'identity.getBlocked',
 *   id: crypto.randomUUID(),
 * };
 * ```
 */
export interface IdentityGetBlockedMessage extends IdentityMessage {
  type: 'identity.getBlocked';
  /** Correlation ID. */
  id: string;
}

/**
 * Request badges awarded to the user (NIP-58).
 *
 * @example
 * ```ts
 * const msg: IdentityGetBadgesMessage = {
 *   type: 'identity.getBadges',
 *   id: crypto.randomUUID(),
 * };
 * ```
 */
export interface IdentityGetBadgesMessage extends IdentityMessage {
  type: 'identity.getBadges';
  /** Correlation ID. */
  id: string;
}

/**
 * Result of identity.getPublicKey. Always succeeds.
 *
 * @example
 * ```ts
 * const msg: IdentityGetPublicKeyResultMessage = {
 *   type: 'identity.getPublicKey.result',
 *   id: 'q1',
 *   pubkey: 'ab12cd...',
 * };
 * ```
 */
export interface IdentityGetPublicKeyResultMessage extends IdentityMessage {
  type: 'identity.getPublicKey.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Hex-encoded public key, or "" when no user/signer is connected. */
  pubkey: string;
}

/**
 * Shell-pushed user identity change notification.
 *
 * This message is not correlated with a request and therefore has no `id`.
 * The pubkey shape matches identity.getPublicKey.result: hex pubkey when a
 * user/signer is connected, or "" when the identity is cleared.
 */
export interface IdentityChangedMessage extends IdentityMessage {
  type: 'identity.changed';
  /** Hex-encoded public key, or "" when no user/signer is connected. */
  pubkey: string;
}

/**
 * Result of identity.getRelays.
 *
 * @example
 * ```ts
 * const msg: IdentityGetRelaysResultMessage = {
 *   type: 'identity.getRelays.result',
 *   id: 'q2',
 *   relays: { 'wss://relay.example.com': { read: true, write: true } },
 * };
 * ```
 */
export interface IdentityGetRelaysResultMessage extends IdentityMessage {
  type: 'identity.getRelays.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Relay URL -> permission map. */
  relays: Record<string, RelayPermission>;
  /** Error message on failure. */
  error?: string;
}

/**
 * Result of identity.getProfile.
 *
 * @example
 * ```ts
 * const msg: IdentityGetProfileResultMessage = {
 *   type: 'identity.getProfile.result',
 *   id: 'q3',
 *   profile: { name: 'Alice', about: 'Nostr dev' },
 * };
 * ```
 */
export interface IdentityGetProfileResultMessage extends IdentityMessage {
  type: 'identity.getProfile.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Profile metadata, or null if not found. */
  profile: ProfileData | null;
  /** Error message on failure. */
  error?: string;
}

/**
 * Result of identity.getFollows.
 *
 * @example
 * ```ts
 * const msg: IdentityGetFollowsResultMessage = {
 *   type: 'identity.getFollows.result',
 *   id: 'q4',
 *   pubkeys: ['ab12...', 'cd34...'],
 * };
 * ```
 */
export interface IdentityGetFollowsResultMessage extends IdentityMessage {
  type: 'identity.getFollows.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Array of hex-encoded public keys. */
  pubkeys: string[];
  /** Error message on failure. */
  error?: string;
}

/**
 * Result of identity.getList.
 *
 * @example
 * ```ts
 * const msg: IdentityGetListResultMessage = {
 *   type: 'identity.getList.result',
 *   id: 'q5',
 *   entries: ['note1abc...', 'note1def...'],
 * };
 * ```
 */
export interface IdentityGetListResultMessage extends IdentityMessage {
  type: 'identity.getList.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** List entries (tag values from the matching event). */
  entries: string[];
  /** Error message on failure. */
  error?: string;
}

/**
 * Result of identity.getZaps.
 *
 * @example
 * ```ts
 * const msg: IdentityGetZapsResultMessage = {
 *   type: 'identity.getZaps.result',
 *   id: 'q6',
 *   zaps: [{ eventId: 'ev1', sender: 'ab12', amount: 21000 }],
 * };
 * ```
 */
export interface IdentityGetZapsResultMessage extends IdentityMessage {
  type: 'identity.getZaps.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Array of zap receipts. */
  zaps: ZapReceipt[];
  /** Error message on failure. */
  error?: string;
}

/**
 * Result of identity.getMutes.
 *
 * @example
 * ```ts
 * const msg: IdentityGetMutesResultMessage = {
 *   type: 'identity.getMutes.result',
 *   id: 'q7',
 *   pubkeys: ['spam1...', 'spam2...'],
 * };
 * ```
 */
export interface IdentityGetMutesResultMessage extends IdentityMessage {
  type: 'identity.getMutes.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Array of hex-encoded muted public keys. */
  pubkeys: string[];
  /** Error message on failure. */
  error?: string;
}

/**
 * Result of identity.getBlocked.
 *
 * @example
 * ```ts
 * const msg: IdentityGetBlockedResultMessage = {
 *   type: 'identity.getBlocked.result',
 *   id: 'q8',
 *   pubkeys: ['blocked1...'],
 * };
 * ```
 */
export interface IdentityGetBlockedResultMessage extends IdentityMessage {
  type: 'identity.getBlocked.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Array of hex-encoded blocked public keys. */
  pubkeys: string[];
  /** Error message on failure. */
  error?: string;
}

/**
 * Result of identity.getBadges.
 *
 * @example
 * ```ts
 * const msg: IdentityGetBadgesResultMessage = {
 *   type: 'identity.getBadges.result',
 *   id: 'q9',
 *   badges: [{ id: 'badge1', name: 'Early Adopter', awardedBy: 'cd34...' }],
 * };
 * ```
 */
export interface IdentityGetBadgesResultMessage extends IdentityMessage {
  type: 'identity.getBadges.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Array of badges awarded to the user. */
  badges: Badge[];
  /** Error message on failure. */
  error?: string;
}

/** Napplet -> Shell identity request messages. */
export type IdentityRequestMessage =
  | IdentityGetPublicKeyMessage
  | IdentityGetRelaysMessage
  | IdentityGetProfileMessage
  | IdentityGetFollowsMessage
  | IdentityGetListMessage
  | IdentityGetZapsMessage
  | IdentityGetMutesMessage
  | IdentityGetBlockedMessage
  | IdentityGetBadgesMessage;

/** Shell -> Napplet identity result and push messages. */
export type IdentityResultMessage =
  | IdentityGetPublicKeyResultMessage
  | IdentityChangedMessage
  | IdentityGetRelaysResultMessage
  | IdentityGetProfileResultMessage
  | IdentityGetFollowsResultMessage
  | IdentityGetListResultMessage
  | IdentityGetZapsResultMessage
  | IdentityGetMutesResultMessage
  | IdentityGetBlockedResultMessage
  | IdentityGetBadgesResultMessage;

/** All identity NAP message types (discriminated union on `type` field). */
export type IdentityNapMessage = IdentityRequestMessage | IdentityResultMessage;
