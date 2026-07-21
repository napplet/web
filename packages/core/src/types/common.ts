import type { NostrEvent, RelayEventResult } from './nostr.js';

/** NIP-19 entity types NAP-COMMON exposes to napplets. */
export type CommonNip19Type = 'npub' | 'note' | 'nprofile' | 'nevent' | 'naddr' | 'nrelay';

/** Hex-encoded public key. */
export type CommonHexPubkey = string;

/** Hex-encoded Nostr event id. */
export type CommonNostrEventId = string;

/** Input for `common.encodeNip19`. */
export type CommonNip19EncodeInput =
  | { type: 'npub' | 'note'; hex: string }
  | { type: 'nprofile'; pubkey: CommonHexPubkey; relays?: string[] }
  | {
      type: 'nevent';
      eventId: CommonNostrEventId;
      relays?: string[];
      author?: CommonHexPubkey;
      kind?: number;
    }
  | {
      type: 'naddr';
      identifier: string;
      pubkey: CommonHexPubkey;
      kind: number;
      relays?: string[];
    }
  | { type: 'nrelay'; relay: string };

/** Result of `common.encodeNip19`. */
export interface CommonNip19EncodeResult {
  /** Whether the value was encoded. */
  ok: boolean;
  /** Encoded NIP-19 value. */
  value?: string;
  /** Encoded NIP-19 entity type. */
  nip19Type?: CommonNip19Type;
  /** Error reason when encoding failed. */
  error?: string;
}

/** Result of `common.decodeNip19`. */
export interface CommonNip19DecodeResult {
  /** Whether the value was decoded. */
  ok: boolean;
  /** Decoded NIP-19 entity type. */
  nip19Type?: CommonNip19Type;
  /** Hex field for `npub` and `note`. */
  hex?: string;
  /** Profile/address public key. */
  pubkey?: CommonHexPubkey;
  /** Event id for `nevent`. */
  eventId?: CommonNostrEventId;
  /** Address identifier for `naddr`. */
  identifier?: string;
  /** Relay hints carried by the value. */
  relays?: string[];
  /** Author hint for `nevent`. */
  author?: CommonHexPubkey;
  /** Kind hint for `nevent` / `naddr`. */
  kind?: number;
  /** Relay URL for `nrelay`. */
  relay?: string;
  /** Error reason when decoding failed. */
  error?: string;
}

/** Target accepted by `common.getProfile`: hex pubkey, npub, or nprofile. */
export type CommonProfileTarget = string;

/** Kind 0 metadata fields returned by `common.getProfile`. */
export interface CommonProfileData {
  name?: string;
  displayName?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  website?: string;
  [key: string]: unknown;
}

/** Result of `common.getProfile`. */
export interface CommonProfileResult {
  /** Whether the lookup completed. */
  ok: boolean;
  /** Resolved profile public key. */
  pubkey: CommonHexPubkey;
  /** Latest profile metadata, or null when none was found. */
  profile?: CommonProfileData | null;
  /** Relay-owned kind 0 event result backing the profile data. */
  result?: RelayEventResult;
  /** Error reason when lookup failed. */
  error?: string;
}

/** Result of `common.follows`. */
export interface CommonFollowsResult {
  /** Whether follows were resolved. */
  ok: boolean;
  /** Followed public keys, normalized to hex. */
  pubkeys: CommonHexPubkey[];
  /** Error reason when follows could not be resolved. */
  error?: string;
}

/** Result shared by modifying social actions. */
export interface CommonActionResult {
  /** Whether the shell completed the action. */
  ok: boolean;
  /** Published event id, when available. */
  eventId?: CommonNostrEventId;
  /** Published event, when available. */
  event?: NostrEvent;
  /** Error reason when the action failed or was denied. */
  error?: string;
}

/** Reaction content accepted by `common.react`. */
export type CommonReaction = '+' | '-' | (string & {});

/** NIP-56 report reason accepted by `common.report`. */
export type CommonReportReason =
  | 'nudity'
  | 'malware'
  | 'profanity'
  | 'illegal'
  | 'spam'
  | 'impersonation'
  | 'other';

/** Report a Nostr event. */
export interface CommonEventReportTarget {
  type: 'event';
  id: CommonNostrEventId;
  pubkey?: CommonHexPubkey;
  relay?: string;
}

/** Report a public key. */
export interface CommonPubkeyReportTarget {
  type: 'pubkey';
  pubkey: CommonHexPubkey | string;
  relay?: string;
}

/** Target accepted by `common.report`. */
export type CommonReportTarget = CommonEventReportTarget | CommonPubkeyReportTarget;
