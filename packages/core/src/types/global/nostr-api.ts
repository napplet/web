import type { NostrEvent, NostrFilter, RelayEventResult, Subscription, EventTemplate } from '../nostr.js';

/**
 * NIP-01 relay operations: subscribe to events, publish events, one-shot queries.
 * Routes through the shell's relay pool via postMessage.
 */
export interface RelayApi {
  /**
   * Open a live NIP-01 subscription through the shell's relay pool.
   * @param filters  One or more NIP-01 subscription filters
   * @param onEvent  Called for each matching event result
   * @param onEose   Called when the shell signals end of stored events (EOSE)
   * @param options  Optional: `{ relay, group }` for NIP-29 scoped relay subscriptions
   * @returns A Subscription handle with a `close()` method
   */
  subscribe(
    filters: NostrFilter | NostrFilter[],
    onEvent: (result: RelayEventResult) => void,
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
   * @returns Promise resolving to array of matching event results
   */
  query(filters: NostrFilter | NostrFilter[]): Promise<RelayEventResult[]>;
}

/**
 * Inter-napplet pubsub: broadcast and receive INC events through the shell.
 */
export interface IncApi {
  /**
   * Broadcast an INC message to other napplets via the shell.
   * @param topic    An opaque stable topic or a convention URI such as
   *                 `napplet:profile/open?pubkey=abc123`
   * @param payload  Optional opaque message payload
   */
  emit(topic: string, payload?: unknown): void;
  /**
   * Subscribe to INC events on a specific topic.
   * @param topic     The exact topic value to listen for
   * @param callback  Called with one runtime-attested INC event
   * @returns A Subscription handle with a `close()` method
   */
  on(topic: string, callback: (event: IncEvent) => void): Subscription;
  /** Point-to-point channel operations. */
  channel: IncChannelApi;
}

/** A topic event delivered by the runtime. */
export interface IncEvent {
  /** Exact subscribed topic. */
  topic: string;
  /** Runtime-attested emitting authenticated endpoint identifier. */
  sender: string;
  /** Optional opaque payload. */
  payload?: unknown;
}

/** A message delivered through an open INC channel. */
export interface ChannelEvent {
  /** Shell-assigned opaque channel identifier. */
  channelId: string;
  /** Runtime-attested sender endpoint identifier. */
  sender: string;
  /** Optional opaque payload. */
  payload?: unknown;
}

/** Terminal channel notification retained for late handlers. */
export interface ChannelClosed {
  /** Shell-assigned opaque channel identifier. */
  channelId: string;
  /** Optional runtime-supplied close reason. */
  reason?: string;
}

/** Informational snapshot of an active channel. */
export interface ChannelInfo {
  /** Shell-assigned opaque channel identifier. */
  id: string;
  /** Peer authenticated endpoint identifier. */
  peer: string;
}

/** Symmetric handle exposed to both endpoints of an INC channel. */
export interface ChannelHandle extends ChannelInfo {
  /** Send an opaque payload to the peer. */
  emit(payload?: unknown): void;
  /** Receive peer events. */
  on(callback: (event: ChannelEvent) => void): Subscription;
  /** Receive the retained terminal close record. */
  onClosed(callback: (event: ChannelClosed) => void): Subscription;
  /** Close the channel for both endpoints. */
  close(): void;
}

/** Point-to-point INC channel operations. */
export interface IncChannelApi {
  /** Open a channel to a target authenticated endpoint identifier. */
  open(target: string): Promise<ChannelHandle>;
  /** Receive inbound channel handles. */
  onOpened(callback: (handle: ChannelHandle) => void): Subscription;
  /** List active inbound and outbound channels. */
  list(): Promise<ChannelInfo[]>;
  /** Send a payload to all open channel peers. */
  broadcast(payload?: unknown): void;
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
