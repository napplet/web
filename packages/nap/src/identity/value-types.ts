/**
 * @napplet/nap/identity -- Identity value types (profiles, zaps, badges, relays).
 *
 * Plain data shapes carried inside identity NAP result messages. These are the
 * read-only payloads the shell returns for identity queries; the wire message
 * types that wrap them live in `./message-types.js`.
 */

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
