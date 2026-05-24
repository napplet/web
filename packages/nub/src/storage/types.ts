/**
 * @napplet/nub/storage -- Scoped storage message types for the JSON envelope wire protocol.
 *
 * Defines 8 message types for key-value storage proxied through the shell:
 * - Napplet -> Shell: get, set, remove, keys
 * - Shell -> Napplet: get.result, set.result, remove.result, keys.result
 *
 * All types form a discriminated union on the `type` field.
 * Values are strings; null indicates a missing key.
 * All results include an optional `error` field.
 */

import type { NappletMessage } from '@napplet/core';

/** The NUB domain name for storage messages. */
export const DOMAIN = 'storage' as const;

/**
 * Base interface for all storage NUB messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface StorageMessage extends NappletMessage {
  /** Message type in "storage.<action>" format. */
  type: `storage.${string}`;
}

/**
 * Retrieve a stored value by key.
 *
 * @example
 * ```ts
 * const msg: StorageGetMessage = {
 *   type: 'storage.get',
 *   id: crypto.randomUUID(),
 *   key: 'user-preference',
 * };
 * ```
 */
export interface StorageGetMessage extends StorageMessage {
  type: 'storage.get';
  /** Correlation ID. */
  id: string;
  /** The storage key to retrieve. */
  key: string;
}

/**
 * Store a key-value pair.
 *
 * @example
 * ```ts
 * const msg: StorageSetMessage = {
 *   type: 'storage.set',
 *   id: crypto.randomUUID(),
 *   key: 'user-preference',
 *   value: 'dark-mode',
 * };
 * ```
 */
export interface StorageSetMessage extends StorageMessage {
  type: 'storage.set';
  /** Correlation ID. */
  id: string;
  /** The storage key. */
  key: string;
  /** The string value to store. */
  value: string;
}

/**
 * Remove a stored key.
 */
export interface StorageRemoveMessage extends StorageMessage {
  type: 'storage.remove';
  /** Correlation ID. */
  id: string;
  /** The storage key to remove. */
  key: string;
}

/**
 * List all storage keys for this napplet.
 */
export interface StorageKeysMessage extends StorageMessage {
  type: 'storage.keys';
  /** Correlation ID. */
  id: string;
}

/**
 * Result of a storage.get request.
 */
export interface StorageGetResultMessage extends StorageMessage {
  type: 'storage.get.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The stored value, or null if key does not exist. */
  value: string | null;
  /** Error message if request failed. */
  error?: string;
}

/**
 * Result of a storage.set request.
 */
export interface StorageSetResultMessage extends StorageMessage {
  type: 'storage.set.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Error message if request failed (e.g., quota exceeded). */
  error?: string;
}

/**
 * Result of a storage.remove request.
 */
export interface StorageRemoveResultMessage extends StorageMessage {
  type: 'storage.remove.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Error message if request failed. */
  error?: string;
}

/**
 * Result of a storage.keys request.
 */
export interface StorageKeysResultMessage extends StorageMessage {
  type: 'storage.keys.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Array of all storage keys for this napplet. */
  keys: string[];
  /** Error message if request failed. */
  error?: string;
}

/** Napplet -> Shell storage request messages. */
export type StorageRequestMessage =
  | StorageGetMessage
  | StorageSetMessage
  | StorageRemoveMessage
  | StorageKeysMessage;

/** Shell -> Napplet storage result messages. */
export type StorageResultMessage =
  | StorageGetResultMessage
  | StorageSetResultMessage
  | StorageRemoveResultMessage
  | StorageKeysResultMessage;

/** All storage NUB message types (discriminated union on `type` field). */
export type StorageNubMessage = StorageRequestMessage | StorageResultMessage;
