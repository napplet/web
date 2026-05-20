/**
 * @napplet/nub/identity -- Read-only user identity query message types
 * for the JSON envelope wire protocol.
 *
 * Defines 18 message types for identity queries:
 * - Napplet -> Shell: getPublicKey, getRelays, getProfile, getFollows,
 *   getList, getZaps, getMutes, getBlocked, getBadges
 * - Shell -> Napplet: corresponding .result for each query
 *
 * All types form a discriminated union on the `type` field.
 * All queries are strictly read-only -- no signing, encryption, or decryption.
 */

import type { NappletMessage, NostrEvent, Rumor } from '@napplet/core';

// ─── Domain Constants ──────────────────────────────────────────────────────

/** The NUB domain name for identity messages. */
export const DOMAIN = 'identity' as const;

// ─── Supporting Types ──────────────────────────────────────────────────────

/**
 * User profile metadata from kind 0 events.
 *
 * @example
 * ```ts
 * const profile: ProfileData = {
 *   name: 'alice',
 *   displayName: 'Alice',
 *   about: 'Nostr developer',
 *   picture: 'https://example.com/avatar.png',
 * };
 * ```
 */
export interface ProfileData {
  name?: string;
  displayName?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  website?: string;
}

/**
 * A zap receipt with sender, amount, and optional content.
 *
 * @example
 * ```ts
 * const zap: ZapReceipt = {
 *   eventId: 'abc123...',
 *   sender: 'pubkey123...',
 *   amount: 21000,
 *   content: 'Great post!',
 * };
 * ```
 */
export interface ZapReceipt {
  /** Event ID of the zap receipt (kind 9735). */
  eventId: string;
  /** Hex-encoded public key of the zap sender. */
  sender: string;
  /** Zap amount in millisats. */
  amount: number;
  /** Optional zap comment. */
  content?: string;
}

/**
 * A badge awarded to the user (NIP-58).
 *
 * @example
 * ```ts
 * const badge: Badge = {
 *   id: 'badge-def-123...',
 *   name: 'Early Adopter',
 *   awardedBy: 'pubkey456...',
 * };
 * ```
 */
export interface Badge {
  /** Badge definition event ID or `d` tag identifier. */
  id: string;
  /** Human-readable badge name. */
  name?: string;
  /** Badge description. */
  description?: string;
  /** Badge image URL. */
  image?: string;
  /** Thumbnail image URLs. */
  thumbs?: string[];
  /** Hex-encoded public key of the badge issuer. */
  awardedBy: string;
}

/**
 * Relay read/write permission flags.
 *
 * @example
 * ```ts
 * const perm: RelayPermission = { read: true, write: false };
 * ```
 */
export interface RelayPermission {
  read: boolean;
  write: boolean;
}

// ─── Base Message Type ─────────────────────────────────────────────────────

/**
 * Base interface for all identity NUB messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface IdentityMessage extends NappletMessage {
  /** Message type in "identity.<action>" format. */
  type: `identity.${string}`;
}

// ─── Napplet -> Shell Request Messages ─────────────────────────────────────

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

// ─── Shell -> Napplet Result Messages ────────────────────────────────────

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
  /** Hex-encoded public key. */
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

// ─── Decrypt Surface (NIP-04 / NIP-44 / NIP-17 gift-wrap) ──────────────────

/**
 * Error code vocabulary for identity.decrypt.error envelopes.
 *
 * 8-code string-literal union:
 * - `class-forbidden`: napplet is not assigned `class: 1` per NUB-CLASS-1 (shell rejects at boundary)
 * - `signer-denied`: user explicitly refused the decrypt via shell consent UI
 * - `signer-unavailable`: signer is not connected or not reachable
 * - `decrypt-failed`: crypto operation failed (bad key, malformed ciphertext, etc.)
 * - `malformed-wrap`: outer event signature invalid or event shape unparseable
 * - `impersonation`: NIP-17 seal.pubkey does NOT match rumor.pubkey (spoofed author)
 * - `unsupported-encryption`: encryption scheme not supported by the shell
 * - `policy-denied`: shell-side policy rejected the request (e.g., rate-limit)
 *
 * All error codes are stable wire values; spec guarantees enumeration.
 */
export type IdentityDecryptErrorCode =
  | 'class-forbidden'
  | 'signer-denied'
  | 'signer-unavailable'
  | 'decrypt-failed'
  | 'malformed-wrap'
  | 'impersonation'
  | 'unsupported-encryption'
  | 'policy-denied';

/**
 * Request the shell to decrypt a received Nostr event.
 *
 * Shape auto-detection: shell inspects the event (kind, tags, content shape)
 * and dispatches to NIP-04 / direct NIP-44 / NIP-17 gift-wrap handlers.
 * Napplet does NOT select the encryption mode.
 *
 * One-shot request/result — mirrors relay.publishEncrypted shape (NOT a subscription).
 *
 * Only legal for napplets assigned class: 1 per NUB-CLASS-1 (shell-enforced).
 *
 * @example
 * ```ts
 * const msg: IdentityDecryptMessage = {
 *   type: 'identity.decrypt',
 *   id: crypto.randomUUID(),
 *   event: receivedGiftWrapEvent,
 * };
 * ```
 */
export interface IdentityDecryptMessage extends IdentityMessage {
  type: 'identity.decrypt';
  /** Correlation ID. */
  id: string;
  /** The received event (outer wrap for NIP-17; kind-4 for NIP-04; etc.). */
  event: NostrEvent;
}

/**
 * Successful result of identity.decrypt.
 *
 * Rumor carries its own real `created_at`; outer gift-wrap `created_at`
 * (randomized ±2 days per NIP-59 for sender-anonymity) is INTENTIONALLY
 * not surfaced. Exposing it would undo the privacy floor.
 *
 * `sender` is shell-authenticated from the validated seal signature
 * (for NIP-17 flows) — NOT derived by the napplet from rumor.pubkey
 * (unsigned → attacker-controlled impersonation surface).
 *
 * @example
 * ```ts
 * const msg: IdentityDecryptResultMessage = {
 *   type: 'identity.decrypt.result',
 *   id: 'req-1',
 *   rumor: { id: '...', pubkey: '...', kind: 14, content: 'hi', tags: [], created_at: 123 },
 *   sender: 'ab12...',
 * };
 * ```
 */
export interface IdentityDecryptResultMessage extends IdentityMessage {
  type: 'identity.decrypt.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The decrypted rumor (UnsignedEvent & { id: string }). */
  rumor: Rumor;
  /** Shell-authenticated sender pubkey (from seal signature, not rumor.pubkey). */
  sender: string;
}

/**
 * Error result of identity.decrypt.
 *
 * Typed discriminator via IdentityDecryptErrorCode — never throws a generic Error.
 * Optional free-form `message?` is for debugging only; MUST NOT leak napplet-internal
 * details or other napplets' identities (per spec shell responsibility).
 *
 * @example
 * ```ts
 * const msg: IdentityDecryptErrorMessage = {
 *   type: 'identity.decrypt.error',
 *   id: 'req-1',
 *   error: 'class-forbidden',
 *   message: 'current class: 2',
 * };
 * ```
 */
export interface IdentityDecryptErrorMessage extends IdentityMessage {
  type: 'identity.decrypt.error';
  /** Correlation ID matching the original request. */
  id: string;
  /** Typed error code from IdentityDecryptErrorCode (8-value union). */
  error: IdentityDecryptErrorCode;
  /** Optional debug message; MUST NOT leak napplet-internal details. */
  message?: string;
}

// ─── Discriminated Unions ──────────────────────────────────────────────────

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
  | IdentityGetBadgesMessage
  | IdentityDecryptMessage;

/** Shell -> Napplet identity result messages. */
export type IdentityResultMessage =
  | IdentityGetPublicKeyResultMessage
  | IdentityGetRelaysResultMessage
  | IdentityGetProfileResultMessage
  | IdentityGetFollowsResultMessage
  | IdentityGetListResultMessage
  | IdentityGetZapsResultMessage
  | IdentityGetMutesResultMessage
  | IdentityGetBlockedResultMessage
  | IdentityGetBadgesResultMessage
  | IdentityDecryptResultMessage
  | IdentityDecryptErrorMessage;

/** All identity NUB message types (discriminated union on `type` field). */
export type IdentityNubMessage = IdentityRequestMessage | IdentityResultMessage;
