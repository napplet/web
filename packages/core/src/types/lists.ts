/** NIP-51 list item kinds accepted by NAP-LISTS mutation requests. */
export type ListItemType =
  | 'pubkey'
  | 'event'
  | 'address'
  | 'hashtag'
  | 'word'
  | 'relay'
  | 'emoji'
  | 'server'
  | 'url'
  | 'group';

/** Public items are written to tags; private items are runtime-encrypted. */
export type ListItemVisibility = 'public' | 'private';

/** Reference a NIP-51 list by exact kind or derived type name. */
export type ListRef =
  | {
      /** Direct NIP-51 event kind. */
      kind: number;
      type?: never;
      /** NIP-51 `d` tag value for addressable sets. */
      identifier?: string;
    }
  | {
      kind?: never;
      /** Type derived from the NIP-51 table name. */
      type: string;
      /** NIP-51 `d` tag value for addressable sets. */
      identifier?: string;
    };

/** A list item mutation intent. The runtime owns NIP-51 tag encoding. */
export interface ListItem {
  /** Semantic item type; the runtime maps this to the selected list's NIP-51 tag. */
  itemType: ListItemType;
  /** Item value: pubkey, event id, address, relay URL, word, etc. */
  value: string;
  /** Optional relay hint. */
  relay?: string;
  /** Optional user-visible label. */
  label?: string;
  /** Whether the item should be public or private. Omitted means public for add. */
  visibility?: ListItemVisibility;
}

/** Options for add/remove list mutation requests. */
export interface ListOptions {
  /** Create a missing list when supported by the runtime. */
  create?: boolean;
  /** Optional title metadata for created/addressable lists. */
  title?: string;
  /** Optional description metadata for created/addressable lists. */
  description?: string;
  /** Optional image metadata for created/addressable lists. */
  image?: string;
}

/** One list kind/type supported by the runtime's policy and implementation. */
export interface ListSupport {
  /** Direct NIP-51 event kind. */
  kind: number;
  /** Type derived from the NIP-51 table name. */
  type: string;
  /** Whether this list requires an addressable `identifier`. */
  addressable: boolean;
  /** Item types the runtime accepts for this list. */
  supportedItemTypes?: ListItemType[];
  /** Whether private list items are supported for this list. */
  privateItems?: boolean;
}

/** Common NAP-LISTS error codes. */
export type ListErrorCode =
  | 'unsupported-list'
  | 'unsupported-item'
  | 'invalid-list-ref'
  | 'ambiguous-list'
  | 'missing-identifier'
  | 'invalid-item'
  | 'not-signed-in'
  | 'list-not-found'
  | 'list-unavailable'
  | 'private-items-unsupported'
  | 'decrypt-failed'
  | 'user-denied'
  | 'publish-failed'
  | 'unsupported'
  | (string & {});

/** Result of a NAP-LISTS add/remove mutation. */
export interface ListMutationResult {
  /** Whether the runtime completed the requested mutation. */
  ok: boolean;
  /** Signed event id when available. */
  eventId?: string;
  /** Optional redacted or complete signed event returned by the runtime. */
  event?: Record<string, unknown>;
  /** Number of items added. */
  added?: number;
  /** Number of items removed. */
  removed?: number;
  /** Number of no-op items skipped. */
  skipped?: number;
  /** Machine-readable error code. */
  error?: ListErrorCode;
  /** Human-readable failure reason. */
  reason?: string;
  /** Supported candidates, especially for unsupported or ambiguous requests. */
  supported?: ListSupport[];
}
