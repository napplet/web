/**
 * Napplet NAP lists types entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/lists -- Runtime-mediated NIP-51 list mutation message types.
 *
 * NAP-LISTS lets a napplet ask the runtime to add or remove semantic items from
 * supported NIP-51 lists. The runtime owns lookup, kind/type mapping, tag
 * formatting, private item encryption, event preservation, signing, and
 * publishing.
 */

import type {
  ListErrorCode,
  ListItem,
  ListItemType,
  ListItemVisibility,
  ListMutationResult,
  ListOptions,
  ListRef,
  ListSupport,
  NappletMessage,
} from '@napplet/core';

/** The NAP domain name for runtime-mediated list mutations. */
export const DOMAIN = 'lists' as const;

export type {
  ListErrorCode,
  ListItem,
  ListItemType,
  ListItemVisibility,
  ListMutationResult,
  ListOptions,
  ListRef,
  ListSupport,
};

/** Base interface for all lists NAP messages. */
export interface ListsMessage extends NappletMessage {
  /** Message type in "lists.<action>" format. */
  type: `lists.${string}`;
}

/** Request the runtime's supported NIP-51 list set. */
export interface ListsSupportedMessage extends ListsMessage {
  type: 'lists.supported';
  /** Correlation ID for this request. */
  id: string;
}

/** Result of a `lists.supported` request. */
export interface ListsSupportedResultMessage extends ListsMessage {
  type: 'lists.supported.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Supported NIP-51 list kinds/types. */
  lists?: ListSupport[];
  /** Top-level error if supported lists could not be reported. */
  error?: string;
}

/** Request that the runtime add items to a NIP-51 list. */
export interface ListsAddMessage extends ListsMessage {
  type: 'lists.add';
  /** Correlation ID for this request. */
  id: string;
  /** List reference by kind or derived type. */
  list: ListRef;
  /** Items to add. */
  items: ListItem[];
  /** Optional create/metadata hints. */
  options?: ListOptions;
}

/** Result of a `lists.add` request. */
export interface ListsAddResultMessage extends ListsMessage, Omit<ListMutationResult, 'removed'> {
  type: 'lists.add.result';
  /** Correlation ID matching the original request. */
  id: string;
}

/** Request that the runtime remove items from a NIP-51 list. */
export interface ListsRemoveMessage extends ListsMessage {
  type: 'lists.remove';
  /** Correlation ID for this request. */
  id: string;
  /** List reference by kind or derived type. */
  list: ListRef;
  /** Items to remove. */
  items: ListItem[];
  /** Optional runtime hints. */
  options?: ListOptions;
}

/** Result of a `lists.remove` request. */
export interface ListsRemoveResultMessage extends ListsMessage, Omit<ListMutationResult, 'added'> {
  type: 'lists.remove.result';
  /** Correlation ID matching the original request. */
  id: string;
}

/** Napplet -> runtime lists messages. */
export type ListsOutboundMessage =
  | ListsSupportedMessage
  | ListsAddMessage
  | ListsRemoveMessage;

/** Runtime -> napplet lists messages. */
export type ListsInboundMessage =
  | ListsSupportedResultMessage
  | ListsAddResultMessage
  | ListsRemoveResultMessage;

/** All lists NAP message types. */
export type ListsNapMessage = ListsOutboundMessage | ListsInboundMessage;
