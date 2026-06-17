import type { NostrEvent, NostrFilter, Subscription, EventTemplate } from '../nostr.js';

/**
 * NIP-01 relay operations: subscribe to events, publish events, one-shot queries.
 * Routes through the shell's relay pool via postMessage.
 */
export interface RelayApi {
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
  ): Subscription;
  /**
   * Sign and publish a Nostr event through the shell.
   * @param template  Unsigned event template
   * @param options   Optional: `{ relay: true }` to publish via scoped relay
   * @returns The signed NostrEvent after successful publication
   */
  publish(template: EventTemplate, options?: { relay?: boolean }): Promise<NostrEvent>;
  /**
   * Publish an encrypted Nostr event through the shell.
   * The shell encrypts content, signs the event, and broadcasts it.
   * @param template    Unsigned event template
   * @param recipient   Hex-encoded recipient public key
   * @param encryption  Encryption scheme: 'nip44' (default) or 'nip04'
   * @returns The signed encrypted NostrEvent after successful publication
   */
  publishEncrypted(template: EventTemplate, recipient: string, encryption?: 'nip44' | 'nip04'): Promise<NostrEvent>;
  /**
   * One-shot query: subscribe, collect events until EOSE, then resolve.
   * @param filters  NIP-01 subscription filters
   * @returns Promise resolving to array of matching NostrEvent objects
   */
  query(filters: NostrFilter | NostrFilter[]): Promise<NostrEvent[]>;
}

/**
 * Inter-napplet pubsub: broadcast and receive INC-PEER events through the shell.
 */
export interface IncApi {
  /**
   * Broadcast an INC-PEER event to other napplets via the shell.
   * @param topic      The 't' tag value (e.g., 'profile:open')
   * @param extraTags  Additional NIP-01 tags beyond the 't' tag (default: [])
   * @param content    Event content (default: empty string)
   */
  emit(topic: string, extraTags?: string[][], content?: string): void;
  /**
   * Subscribe to INC-PEER events on a specific topic.
   * @param topic     The 't' tag value to listen for
   * @param callback  Called with `(payload, event)` for each matching event
   * @returns A Subscription handle with a `close()` method
   */
  on(topic: string, callback: (payload: unknown, event: NostrEvent) => void): Subscription;
}

/**
 * Per-instance napplet storage: identical surface to the shared {@link StorageApi}
 * methods, but every request is scoped to this napplet instance rather than
 * shared across all instances of the same napplet type.
 *
 * Reached via `window.napplet.storage.instance.*`. On the wire each call sets
 * `scope: "instance"`; the shared top-level methods omit `scope` entirely.
 *
 * Non-normative summary — defer to NAP-STORAGE (napplet/naps) for the
 * authoritative scope semantics.
 */
export interface NappletInstanceStorage {
  /**
   * Retrieve a per-instance value by key. Returns null if the key does not exist.
   * @param key  The storage key
   * @returns The stored string value, or null if not found
   */
  getItem(key: string): Promise<string | null>;
  /**
   * Store a per-instance key-value pair.
   * @param key    The storage key
   * @param value  The string value to store
   * @throws If the napplet exceeds its storage quota
   */
  setItem(key: string, value: string): Promise<void>;
  /**
   * Remove a per-instance key.
   * @param key  The storage key to remove
   */
  removeItem(key: string): Promise<void>;
  /**
   * List all per-instance keys for this napplet instance.
   * @returns Array of storage key strings
   */
  keys(): Promise<string[]>;
}

/**
 * Napplet-scoped storage: async localStorage-like API proxied through the shell.
 * Each napplet's storage is isolated by identity — napplets cannot read each other's data.
 */
export interface StorageApi {
  /**
   * Retrieve a stored value by key. Returns null if the key does not exist.
   * @param key  The storage key
   * @returns The stored string value, or null if not found
   */
  getItem(key: string): Promise<string | null>;
  /**
   * Store a key-value pair.
   * @param key    The storage key
   * @param value  The string value to store
   * @throws If the napplet exceeds its storage quota
   */
  setItem(key: string, value: string): Promise<void>;
  /**
   * Remove a stored key.
   * @param key  The storage key to remove
   */
  removeItem(key: string): Promise<void>;
  /**
   * List all keys stored by this napplet.
   * @returns Array of storage key strings
   */
  keys(): Promise<string[]>;
  /**
   * Per-instance storage: same surface as the shared methods above, but scoped
   * to this napplet instance. Sets `scope: "instance"` on the wire; the shared
   * top-level methods emit no `scope` field.
   *
   * Non-normative summary — defer to NAP-STORAGE (napplet/naps).
   */
  instance: NappletInstanceStorage;
}

/**
 * Keyboard forwarding and action keybindings: register named actions the shell
 * can bind to keys, forward unbound keystrokes to the shell, listen for
 * shell-triggered actions locally.
 *
 * @example
 * ```ts
 * // Register an action the shell can bind to a key:
 * const result = await window.napplet.keys.registerAction({
 *   id: 'editor.save', label: 'Save', defaultKey: 'Ctrl+S',
 * });
 *
 * // Listen for the bound key locally:
 * const sub = window.napplet.keys.onAction('editor.save', () => {
 *   console.log('Save triggered!');
 * });
 *
 * // Unregister when no longer needed:
 * window.napplet.keys.unregisterAction('editor.save');
 * ```
 */
export interface KeysApi {
  /**
   * Declare a named action that the shell can bind to a key.
   * The shell decides the actual binding; `defaultKey` is a hint only.
   * @param action  The action to register (id, label, optional defaultKey)
   * @returns The assigned binding, if any
   */
  registerAction(action: {
    id: string;
    label: string;
    defaultKey?: string;
  }): Promise<{ actionId: string; binding?: string }>;
  /**
   * Remove a previously registered action. The shell removes any binding
   * and updates the suppress list.
   * @param actionId  The action to unregister
   */
  unregisterAction(actionId: string): void;
  /**
   * Register a local handler for when a bound key is pressed.
   * This is NOT a wire message — the shim intercepts the key locally
   * and invokes the callback with zero latency.
   * @param actionId  The action to listen for
   * @param callback  Called when the action is triggered
   * @returns A Subscription with `close()` to stop listening
   */
  onAction(actionId: string, callback: () => void): Subscription;
}
