
import type { NappletGlobalShell } from './envelope.js';

/**
 * Standard NIP-01 nostr event.
 * @example
 * ```ts
 * const event: NostrEvent = {
 *   id: '...', pubkey: '...', created_at: 1234567890,
 *   kind: 1, tags: [['t', 'topic']], content: 'Hello', sig: '...',
 * };
 * ```
 */
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/**
 * NIP-01 subscription filter.
 * @example
 * ```ts
 * const filter: NostrFilter = { kinds: [1], authors: ['abc123...'], limit: 10 };
 * ```
 */
export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  [key: `#${string}`]: string[] | undefined;
}

/**
 * Subscription handle returned by relay.subscribe() and ifc.on().
 * Call close() to unsubscribe and stop receiving events.
 *
 * @example
 * ```ts
 * const sub = window.napplet.relay.subscribe(filter, onEvent, onEose);
 * // Later:
 * sub.close();
 * ```
 */
export interface Subscription {
  /** Close the subscription and stop receiving events. */
  close(): void;
}

/**
 * Unsigned event template passed to relay.publish().
 * The shell signs it before broadcasting.
 *
 * @example
 * ```ts
 * const signed = await window.napplet.relay.publish({
 *   kind: 1,
 *   content: 'Hello Nostr!',
 *   tags: [],
 *   created_at: Math.floor(Date.now() / 1000),
 * });
 * ```
 */
export interface EventTemplate {
  /** Nostr event kind number */
  kind: number;
  /** Event content (typically plaintext or JSON string) */
  content: string;
  /** Event tags (NIP-01 tag arrays) */
  tags: string[][];
  /** Unix timestamp (seconds since epoch) */
  created_at: number;
}

/**
 * Unsigned Nostr event — the canonical "rumor" shape from nostr-tools.
 *
 * Extends EventTemplate-like fields (kind/content/tags/created_at) with `pubkey` — the author
 * whose key signs the wrapping seal/wrap in NIP-17 / NIP-59 flows. NO `sig` field:
 * this shape is intentionally unsigned. Attempting to treat it as signed is a bug.
 *
 * @example
 * ```ts
 * const unsigned: UnsignedEvent = {
 *   kind: 14,
 *   pubkey: 'ab12...',
 *   content: 'hello',
 *   tags: [['p', 'cd34...']],
 *   created_at: 1234567890,
 * };
 * ```
 */
export interface UnsignedEvent {
  /** Nostr event kind number */
  kind: number;
  /** Hex-encoded public key of the author */
  pubkey: string;
  /** Event content (plaintext after decrypt in NIP-17 flows) */
  content: string;
  /** Event tags (NIP-01 tag arrays) */
  tags: string[][];
  /** Unix timestamp (seconds since epoch) — NOT the outer gift-wrap randomized value */
  created_at: number;
}

/**
 * A NIP-17 / NIP-59 rumor — an unsigned event decrypted from a gift-wrap seal
 * with a deterministic `id` derived from its NIP-01 serialization.
 *
 * Shape: UnsignedEvent & { id: string } — the nostr-tools canonical rumor type.
 * Intentionally has NO `sig` field: the rumor is never signed; only the outer
 * wrap and seal carry signatures. Treating a rumor as a signed event is a bug.
 *
 * The `sender` returned alongside a rumor by `identity.decrypt` is shell-authenticated
 * from the seal pubkey post-validation — never derived by the napplet from `rumor.pubkey`
 * (unsigned → attacker-controlled impersonation surface).
 *
 * @example
 * ```ts
 * const rumor: Rumor = {
 *   id: 'abc123...',
 *   kind: 14,
 *   pubkey: 'ab12...',
 *   content: 'hello',
 *   tags: [['p', 'cd34...']],
 *   created_at: 1234567890,
 * };
 * ```
 */
export interface Rumor extends UnsignedEvent {
  /** Deterministic event id (NIP-01 serialization hash of the unsigned event) */
  id: string;
}

/**
 * The window.napplet global installed at runtime by @napplet/shim.
 *
 * The published packages avoid global `Window` type mutation for JSR
 * compatibility. Consumers that access `window.napplet` directly can use this
 * interface in a local ambient declaration or cast:
 * ```ts
 * import type { NappletGlobal } from '@napplet/core';
 * import '@napplet/shim';
 *
 * const napplet = (window as Window & { napplet: NappletGlobal }).napplet;
 * ```
 */
export interface NappletGlobal {
  /**
   * NIP-01 relay operations: subscribe to events, publish events, one-shot queries.
   * Routes through the shell's relay pool via postMessage.
   */
  relay: {
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
  };
  /**
   * Inter-frame pubsub: broadcast and receive IFC-PEER events through the shell.
   */
  ifc: {
    /**
     * Broadcast an IFC-PEER event to other napplets via the shell.
     * @param topic      The 't' tag value (e.g., 'profile:open')
     * @param extraTags  Additional NIP-01 tags beyond the 't' tag (default: [])
     * @param content    Event content (default: empty string)
     */
    emit(topic: string, extraTags?: string[][], content?: string): void;
    /**
     * Subscribe to IFC-PEER events on a specific topic.
     * @param topic     The 't' tag value to listen for
     * @param callback  Called with `(payload, event)` for each matching event
     * @returns A Subscription handle with a `close()` method
     */
    on(topic: string, callback: (payload: unknown, event: NostrEvent) => void): Subscription;
  };
  /**
   * Napplet-scoped storage: async localStorage-like API proxied through the shell.
   * Each napplet's storage is isolated by identity — napplets cannot read each other's data.
   */
  storage: {
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
  };
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
  keys: {
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
  };
  /**
   * Media session control: create sessions, report state and metadata,
   * declare capabilities, receive commands from the shell.
   *
   * @example
   * ```ts
   * // Create a media session:
   * const { sessionId } = await window.napplet.media.createSession({
   *   title: 'My Song', artist: 'The Artist',
   * });
   *
   * // Report playback state:
   * window.napplet.media.reportState(sessionId, {
   *   status: 'playing', position: 42.5, duration: 240,
   * });
   *
   * // Listen for shell commands:
   * window.napplet.media.onCommand(sessionId, (action, value) => {
   *   if (action === 'pause') player.pause();
   * });
   * ```
   */
  media: {
    /**
     * Create a new media session with the shell.
     * @param metadata  Optional initial metadata (title, artist, album, artwork, duration, mediaType)
     * @returns The confirmed session result with sessionId
     */
    createSession(metadata?: {
      title?: string;
      artist?: string;
      album?: string;
      artwork?: { url?: string; hash?: string };
      duration?: number;
      mediaType?: 'audio' | 'video';
    }): Promise<{ sessionId: string }>;
    /**
     * Update metadata for an existing session. Partial updates supported.
     * @param sessionId  The session to update
     * @param metadata   Partial metadata fields to update
     */
    updateSession(sessionId: string, metadata: {
      title?: string;
      artist?: string;
      album?: string;
      artwork?: { url?: string; hash?: string };
      duration?: number;
      mediaType?: 'audio' | 'video';
    }): void;
    /**
     * Destroy a media session.
     * @param sessionId  The session to destroy
     */
    destroySession(sessionId: string): void;
    /**
     * Report current playback state for a session.
     * @param sessionId  The session to report state for
     * @param state      Current playback state
     */
    reportState(sessionId: string, state: {
      status: 'playing' | 'paused' | 'stopped' | 'buffering';
      position?: number;
      duration?: number;
      volume?: number;
    }): void;
    /**
     * Declare which media actions the session currently supports.
     * @param sessionId  The session to update capabilities for
     * @param actions    Currently supported actions
     */
    reportCapabilities(sessionId: string, actions: ('play' | 'pause' | 'stop' | 'next' | 'prev' | 'seek' | 'volume')[]): void;
    /**
     * Listen for media commands from the shell.
     * @param sessionId  The session to listen for commands on
     * @param callback   Called with (action, value?) when a command is received
     * @returns A Subscription with `close()` to stop listening
     */
    onCommand(sessionId: string, callback: (action: 'play' | 'pause' | 'stop' | 'next' | 'prev' | 'seek' | 'volume', value?: number) => void): Subscription;
    /**
     * Listen for the shell's media control list.
     * @param sessionId  The session to associate controls with
     * @param callback   Called with the shell's supported controls
     * @returns A Subscription with `close()` to stop listening
     */
    onControls(sessionId: string, callback: (controls: ('play' | 'pause' | 'stop' | 'next' | 'prev' | 'seek' | 'volume')[]) => void): Subscription;
  };
  /**
   * Shell-rendered notifications: send notifications, set badge counts,
   * register channels, request permission, listen for user interaction.
   *
   * @example
   * ```ts
   * // Send a notification:
   * const { notificationId } = await window.napplet.notify.send({
   *   title: 'New message', body: 'Alice: hey!', priority: 'normal',
   * });
   *
   * // Set badge count:
   * window.napplet.notify.badge(3);
   *
   * // Listen for action clicks:
   * window.napplet.notify.onAction((notificationId, actionId) => {
   *   if (actionId === 'reply') openReply(notificationId);
   * });
   * ```
   */
  notify: {
    /**
     * Send a notification to the shell.
     * @param notification  Notification payload (title required)
     * @returns The shell-assigned notificationId
     */
    send(notification: {
      title: string;
      body?: string;
      icon?: string;
      actions?: { id: string; label: string }[];
      channel?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    }): Promise<{ notificationId: string }>;
    /**
     * Dismiss a notification by ID. Fire-and-forget.
     * @param notificationId  The notification to dismiss
     */
    dismiss(notificationId: string): void;
    /**
     * Set the badge count for this napplet. Pass 0 to clear.
     * @param count  Badge count
     */
    badge(count: number): void;
    /**
     * Register a notification channel for per-category user control.
     * @param channel  Channel definition
     */
    registerChannel(channel: {
      channelId: string;
      label: string;
      description?: string;
      defaultPriority?: 'low' | 'normal' | 'high' | 'urgent';
    }): void;
    /**
     * Request permission to send notifications.
     * @param channel  Optional channel to request permission for
     * @returns Whether permission was granted
     */
    requestPermission(channel?: string): Promise<{ granted: boolean }>;
    /**
     * Listen for action button clicks on notifications.
     * @param callback  Called with (notificationId, actionId)
     * @returns A Subscription with `close()` to stop listening
     */
    onAction(callback: (notificationId: string, actionId: string) => void): Subscription;
    /**
     * Listen for notification body clicks.
     * @param callback  Called with (notificationId)
     * @returns A Subscription with `close()` to stop listening
     */
    onClicked(callback: (notificationId: string) => void): Subscription;
    /**
     * Listen for notification dismissals.
     * @param callback  Called with (notificationId, reason?)
     * @returns A Subscription with `close()` to stop listening
     */
    onDismissed(callback: (notificationId: string, reason?: string) => void): Subscription;
    /**
     * Listen for the shell's notification capability list.
     * @param callback  Called with supported controls
     * @returns A Subscription with `close()` to stop listening
     */
    onControls(callback: (controls: ('toasts' | 'badges' | 'actions' | 'channels' | 'system')[]) => void): Subscription;
  };
  /**
   * Read-only user identity queries: public key, profile, follows, relays,
   * lists, zaps, mutes, blocked, badges. All queries are strictly read-only --
   * no signing, encryption, or decryption.
   *
   * @example
   * ```ts
   * // Get the user's public key:
   * const pubkey = await window.napplet.identity.getPublicKey();
   *
   * // Get profile metadata:
   * const profile = await window.napplet.identity.getProfile();
   * if (profile) console.log(profile.name);
   *
   * // Get follow list:
   * const follows = await window.napplet.identity.getFollows();
   * ```
   */
  identity: {
    /** Get the user's hex-encoded public key. Always succeeds. */
    getPublicKey(): Promise<string>;
    /** Get the user's relay list (NIP-65). */
    getRelays(): Promise<Record<string, { read: boolean; write: boolean }>>;
    /** Get the user's profile metadata (kind 0). Returns null if not found. */
    getProfile(): Promise<{
      name?: string;
      displayName?: string;
      about?: string;
      picture?: string;
      banner?: string;
      nip05?: string;
      lud16?: string;
      website?: string;
    } | null>;
    /** Get the user's follow list (kind 3 contact list). */
    getFollows(): Promise<string[]>;
    /** Get entries from a user's categorized list. */
    getList(listType: string): Promise<string[]>;
    /** Get zap receipts sent to the user. */
    getZaps(): Promise<{
      eventId: string;
      sender: string;
      amount: number;
      content?: string;
    }[]>;
    /** Get the user's mute list (kind 10000). */
    getMutes(): Promise<string[]>;
    /** Get the user's block list. */
    getBlocked(): Promise<string[]>;
    /** Get badges awarded to the user (NIP-58). */
    getBadges(): Promise<{
      id: string;
      name?: string;
      description?: string;
      image?: string;
      thumbs?: string[];
      awardedBy: string;
    }[]>;
    /**
     * Decrypt a received Nostr event (NIP-04 / direct NIP-44 / NIP-17 gift-wrap).
     *
     * Shape is auto-detected by the shell; napplets do NOT select the encryption mode.
     * Only legal for napplets assigned `class: 1` per NUB-CLASS-1; shell rejects
     * from any other class with `class-forbidden`.
     *
     * @param event  The received event (outer wrap for NIP-17, kind-4 for NIP-04, etc.)
     * @returns Promise resolving to { rumor, sender } where `sender` is the
     *   shell-authenticated seal-pubkey (NOT derived from rumor.pubkey). Outer
     *   `created_at` is NOT surfaced (NIP-59 randomizes it ±2 days).
     *   Rejects with a typed `IdentityDecryptErrorCode` on failure.
     */
    decrypt(event: NostrEvent): Promise<{ rumor: Rumor; sender: string }>;
  };
  /**
   * Per-napplet declarative configuration (NUB-CONFIG).
   *
   * Napplet declares a JSON Schema (typically at build time via
   * @napplet/vite-plugin's `configSchema` option, or at runtime via
   * `registerSchema`); shell renders the settings UI, validates values,
   * persists them scoped by `(dTag, aggregateHash)`, and delivers live
   * values via initial snapshot + push. Shell is the sole writer.
   *
   * @example
   * ```ts
   * // Register a schema at runtime (escape hatch; prefer manifest-declared):
   * await window.napplet.config.registerSchema({
   *   type: 'object',
   *   properties: { theme: { type: 'string', enum: ['light', 'dark'], default: 'dark' } },
   * });
   *
   * // Subscribe to live values (first delivery is an immediate snapshot):
   * const sub = window.napplet.config.subscribe((values) => {
   *   applyTheme(values.theme as string);
   * });
   *
   * // Deep-link into shell-owned settings UI:
   * window.napplet.config.openSettings({ section: 'appearance' });
   * ```
   */
  config: {
    /**
     * Register a napplet configuration schema at runtime (runtime escape hatch).
     * Prefer manifest-declared via @napplet/vite-plugin's `configSchema` option.
     * Correlated via UUID; resolves on positive ACK, rejects with
     * `Error(code + ': ' + reason)` on shell rejection.
     * @param schema   JSON Schema (draft-07+) describing the config surface.
     * @param version  Optional `$version` migration hint.
     */
    registerSchema(
      schema: Record<string, unknown>,
      version?: number,
    ): Promise<void>;
    /**
     * Snapshot current validated + defaulted config values.
     * Correlated via UUID; resolves on the matching `config.values` response.
     */
    get(): Promise<Record<string, unknown>>;
    /**
     * Subscribe to live configuration updates. First delivery is an immediate
     * snapshot; subsequent deliveries fire whenever the shell commits a change.
     * Ref-counted: wire-level subscribe/unsubscribe only on 0->1 / 1->0
     * local-subscriber transitions.
     * @param callback  Invoked with the current config values on each push.
     * @returns A Subscription with `close()` to detach.
     */
    subscribe(callback: (values: Record<string, unknown>) => void): Subscription;
    /**
     * Request the shell open its settings UI for this napplet.
     * Fire-and-forget. The optional `section` deep-links to a named section
     * declared via the `x-napplet-section` extension somewhere in the schema.
     * @param options.section  Optional section name to deep-link to.
     */
    openSettings(options?: { section?: string }): void;
    /**
     * Listen for schema-registration errors pushed by the shell (manifest
     * parse failure, `no-schema`, etc.). Uncorrelated fan-out.
     * @param callback  Invoked with `{ code, error }` on each error push.
     * @returns A plain teardown function that detaches the listener.
     */
    onSchemaError(
      callback: (err: { code: string; error: string }) => void,
    ): () => void;
    /**
     * Readonly accessor for the currently-registered JSON Schema.
     * Populated synchronously from the `<meta name="napplet-config-schema">`
     * manifest tag at install time, then updated on successful
     * `registerSchema` responses. `null` until a schema is registered.
     */
    readonly schema: Record<string, unknown> | null;
  };
  /**
   * Browser-enforced resource fetching: napplets request bytes by URL,
   * shell fetches and returns a Blob. The strict-CSP iframe sandbox
   * blocks all napplet-side network access, so this is the canonical
   * (and only) byte-fetching primitive available inside a napplet.
   *
   * URL space is scheme-pluggable: shells register handlers per scheme.
   * The four canonical v0.28.0 schemes are `data:` (decoded in-shim,
   * no round-trip), `https:` (shell-side network with policy), `blossom:`
   * (Blossom hash → bytes), and `nostr:` (NIP-19 single-hop resolution).
   *
   * @example
   * ```ts
   * // Fetch raw bytes:
   * const blob = await window.napplet.resource.bytes('https://example.com/avatar.png');
   *
   * // Get a managed object URL (revoke when done to free memory):
   * const { url, revoke } = window.napplet.resource.bytesAsObjectURL('blossom:abc123...');
   * imgEl.src = url;
   * imgEl.onload = () => revoke();
   * ```
   */
  resource: {
    /**
     * Fetch the bytes referenced by `url` through the shell's resource pipeline.
     * The shell selects a scheme handler, applies its resource policy
     * (private-IP blocks, size caps, timeouts, MIME classification), and
     * returns the bytes as a single Blob. No streaming, no chunking.
     * @param url  URL identifying the resource (any registered scheme)
     * @returns Promise resolving to the fetched bytes as a Blob
     */
    bytes(url: string): Promise<Blob>;
    /**
     * Convenience wrapper around `bytes(url)` that returns a managed
     * object URL plus a `revoke` function. Calling `revoke()` invokes
     * `URL.revokeObjectURL` exactly once to free the underlying Blob.
     * @param url  URL identifying the resource
     * @returns Object containing the blob URL and a revoke function
     */
    bytesAsObjectURL(url: string): { url: string; revoke: () => void };
  };
  /**
   * User-gated direct network access: napplet declares desired `connect` origins
   * at build time via `@napplet/vite-plugin`'s `connect` option; shell prompts the
   * user at first load per `(dTag, aggregateHash)`; shell emits an explicit
   * `connect-src <origin1> <origin2> …` CSP header on approval. The browser
   * enforces network access at the CSP layer — shell has zero visibility into
   * post-grant traffic. Napplet reads its own grant state via this namespace;
   * both fields are populated synchronously at shim install from the
   * `<meta name="napplet-connect-granted">` tag injected by the shell.
   *
   * Graceful degradation: `{ granted: false, origins: [] }` when shell does not
   * advertise `nub:connect`, does not inject the meta tag, or denies the grant.
   * This object is NEVER `undefined`.
   *
   * @example
   * ```ts
   * // Check grant state before firing cross-origin fetches:
   * if (window.napplet.connect.granted) {
   *   // CSP allows connect-src to these origins:
   *   const allowed = window.napplet.connect.origins;
   *   // fetch() will succeed for allowed origins, throw CSP violations otherwise.
   *   const resp = await fetch('https://api.example.com/me');
   * }
   *
   * // Capability-check the shell for the NUB itself:
   * if (window.napplet.shell.supports('nub:connect')) { ... }
   * ```
   */
  connect: {
    /**
     * True when the shell has granted the napplet direct network access to at
     * least one origin declared in its manifest `connect` tags. False when
     * denied, ungranted, or when the shell does not implement `nub:connect`.
     */
    readonly granted: boolean;
    /**
     * Readonly list of origins for which the shell emitted `connect-src` entries.
     * Empty when `granted` is false. Origin format matches CSP source-expression
     * rules: scheme + host + optional non-default port, no path/query/fragment,
     * lowercase host, Punycode for IDN. See NUB-CONNECT spec for normalization.
     */
    readonly origins: readonly string[];
  };
  /**
   * Shell-assigned napplet class (abstract security-posture identifier).
   *
   * Populated by the NUB-CLASS wire message `class.assigned` (shell → napplet,
   * one terminal envelope per lifecycle) after iframe ready. The runtime value
   * is a plain `number`, not a literal union — the class space is extensible
   * as new NUB-CLASS-$N sub-track members are defined. Current canonical
   * classes (defined in the NUB-CLASS track): `1` (strict baseline, no
   * user-declared origins) and `2` (user-approved explicit-origin CSP).
   *
   * `undefined` in three distinct states, all of which napplets MUST handle
   * gracefully:
   * 1. Before the shell has sent `class.assigned` (early bootstrap).
   * 2. When the shell does not implement `nub:class` (capability missing).
   * 3. When the shell implements the NUB but intentionally withholds assignment.
   *
   * Cross-NUB invariant (in shells implementing both NUB-CONNECT and NUB-CLASS):
   * `class === 2` iff `window.napplet.connect.granted === true`. See
   * `specs/SHELL-CLASS-POLICY.md` (Phase 140) for the full shell-responsibility
   * matrix.
   *
   * @example
   * ```ts
   * // Capability-check before branching on class:
   * if (window.napplet.shell.supports('nub:class') && window.napplet.class !== undefined) {
   *   console.log(`napplet running as class ${window.napplet.class}`);
   * } else {
   *   // Shell does not implement nub:class or assignment has not arrived;
   *   // fall back to feature detection (e.g., window.napplet.connect.granted).
   * }
   * ```
   */
  class?: number;
  /**
   * Shell capability queries. Check whether the shell supports a NUB,
   * permission, or numbered NUB protocol.
   *
   * @example
   * ```ts
   * // NUB domain (bare shorthand or prefixed):
   * if (window.napplet.shell.supports('relay')) { ... }
   * if (window.napplet.shell.supports('nub:relay')) { ... }
   *
   * // Permission:
   * if (window.napplet.shell.supports('perm:popups')) { ... }
   *
   * // Numbered NUB protocol over an interface:
   * if (window.napplet.shell.supports('ifc', 'NUB-01')) { ... }
   * ```
   */
  shell: NappletGlobalShell;
}
