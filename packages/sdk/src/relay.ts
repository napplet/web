/**
 * @napplet/sdk -- Relay, inter-napplet pubsub, and storage wrapper objects.
 *
 * @packageDocumentation
 */

import type {
  NostrEvent,
  NostrFilter,
  Subscription,
  EventTemplate,
} from '@napplet/core';
import { requireNapplet } from './require-napplet.js';

/**
 * NIP-01 relay operations: subscribe to events, publish events, one-shot queries.
 *
 * Each method delegates to `window.napplet.relay.*` at call time, which in turn
 * routes through the shell's relay pool via postMessage.
 *
 * @example
 * ```ts
 * import { relay } from '@napplet/sdk';
 *
 * const sub = relay.subscribe(
 *   { kinds: [1], limit: 10 },
 *   (event) => console.log(event),
 *   () => console.log('EOSE'),
 * );
 * ```
 */
export const relay = {
  /**
   * Open a live NIP-01 subscription through the shell's relay pool.
   * @param filters  One or more NIP-01 subscription filters
   * @param onEvent  Called for each matching event
   * @param onEose   Called when the shell signals end of stored events (EOSE)
   * @param options  Optional: `{ relay, group }` for NIP-29 scoped relay subscriptions
   * @returns A Subscription handle with a `close()` method
   */
  subscribe(
    filters: NostrFilter | NostrFilter[],
    onEvent: (event: NostrEvent) => void,
    onEose: () => void,
    options?: { relay?: string; group?: string },
  ): Subscription {
    return requireNapplet().relay.subscribe(filters, onEvent, onEose, options);
  },

  /**
   * Sign and publish a Nostr event through the shell.
   * @param template  Unsigned event template
   * @param options   Optional: `{ relay: true }` to publish via scoped relay
   * @returns The signed NostrEvent after successful publication
   */
  publish(
    template: EventTemplate,
    options?: { relay?: boolean },
  ): Promise<NostrEvent> {
    return requireNapplet().relay.publish(template, options);
  },

  /**
   * Publish an encrypted Nostr event through the shell.
   * @param template    Unsigned event template
   * @param recipient   Hex-encoded recipient public key
   * @param encryption  Encryption scheme: 'nip44' (default) or 'nip04'
   * @returns The signed encrypted NostrEvent after successful publication
   */
  publishEncrypted(
    template: EventTemplate,
    recipient: string,
    encryption: 'nip44' | 'nip04' = 'nip44',
  ): Promise<NostrEvent> {
    return requireNapplet().relay.publishEncrypted(template, recipient, encryption);
  },

  /**
   * One-shot query: subscribe, collect events until EOSE, then resolve.
   * @param filters  NIP-01 subscription filters
   * @returns Promise resolving to array of matching NostrEvent objects
   */
  query(filters: NostrFilter | NostrFilter[]): Promise<NostrEvent[]> {
    return requireNapplet().relay.query(filters);
  },
};

/**
 * Inter-napplet pubsub: broadcast and receive INC-PEER events through the shell.
 *
 * @example
 * ```ts
 * import { inc } from '@napplet/sdk';
 *
 * inc.emit('profile:open', [], JSON.stringify({ pubkey: '...' }));
 *
 * const sub = inc.on('profile:open', (payload) => {
 *   console.log('Profile requested:', payload);
 * });
 * ```
 */
export const inc = {
  /**
   * Broadcast an INC-PEER event to other napplets via the shell.
   * @param topic      The 't' tag value (e.g., 'profile:open')
   * @param extraTags  Additional NIP-01 tags beyond the 't' tag (default: [])
   * @param content    Event content (default: empty string)
   */
  emit(topic: string, extraTags?: string[][], content?: string): void {
    requireNapplet().inc.emit(topic, extraTags, content);
  },

  /**
   * Subscribe to INC-PEER events on a specific topic.
   * @param topic     The 't' tag value to listen for
   * @param callback  Called with `(payload, event)` for each matching event
   * @returns A Subscription handle with a `close()` method
   */
  on(
    topic: string,
    callback: (payload: unknown, event: NostrEvent) => void,
  ): Subscription {
    return requireNapplet().inc.on(topic, callback);
  },
};

/**
 * @deprecated Use {@link inc}. NAP-IFC was renamed to NAP-INC; this package
 * alias is kept only to ease downstream migration.
 */
export const ifc = inc;

/**
 * Napplet-scoped storage: async localStorage-like API proxied through the shell.
 * Each napplet's storage is isolated by identity.
 *
 * @example
 * ```ts
 * import { storage } from '@napplet/sdk';
 *
 * await storage.setItem('theme', 'dark');
 * const theme = await storage.getItem('theme'); // 'dark'
 * ```
 */
export const storage = {
  /**
   * Retrieve a stored value by key. Returns null if the key does not exist.
   * @param key  The storage key
   * @returns The stored string value, or null if not found
   */
  getItem(key: string): Promise<string | null> {
    return requireNapplet().storage.getItem(key);
  },

  /**
   * Store a key-value pair.
   * @param key    The storage key
   * @param value  The string value to store
   */
  setItem(key: string, value: string): Promise<void> {
    return requireNapplet().storage.setItem(key, value);
  },

  /**
   * Remove a stored key.
   * @param key  The storage key to remove
   */
  removeItem(key: string): Promise<void> {
    return requireNapplet().storage.removeItem(key);
  },

  /**
   * List all keys stored by this napplet.
   * @returns Array of storage key strings
   */
  keys(): Promise<string[]> {
    return requireNapplet().storage.keys();
  },

  /**
   * Per-instance storage: same surface as the shared methods, but scoped to this
   * napplet instance (sets `scope: "instance"` on the wire) rather than shared
   * across instances. Defer to NAP-STORAGE (napplet/naps) for scope semantics.
   */
  instance: {
    /**
     * Retrieve a per-instance value by key. Returns null if not found.
     * @param key  The storage key
     */
    getItem(key: string): Promise<string | null> {
      return requireNapplet().storage.instance.getItem(key);
    },

    /**
     * Store a per-instance key-value pair.
     * @param key    The storage key
     * @param value  The string value to store
     */
    setItem(key: string, value: string): Promise<void> {
      return requireNapplet().storage.instance.setItem(key, value);
    },

    /**
     * Remove a per-instance key.
     * @param key  The storage key to remove
     */
    removeItem(key: string): Promise<void> {
      return requireNapplet().storage.instance.removeItem(key);
    },

    /**
     * List all per-instance keys for this napplet instance.
     * @returns Array of storage key strings
     */
    keys(): Promise<string[]> {
      return requireNapplet().storage.instance.keys();
    },
  },
};
