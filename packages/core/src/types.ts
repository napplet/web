
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
 * Subscription handle returned by relay.subscribe() and inc.on().
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

/** The side that fetches/decodes media and emits authoritative playback state. */
export type MediaPlaybackOwner = 'shell' | 'napplet';

/** Source reference for shell-owned media playback or advisory source metadata. */
export interface MediaSourceRef {
  url?: string;
  blossomHash?: string;
  nostr?: {
    eventId?: string;
    address?: string;
    relays?: string[];
  };
  mimeType?: string;
}

/** Media session metadata. */
export interface MediaMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: { url?: string; hash?: string };
  duration?: number;
  mediaType?: 'audio' | 'video';
}

/** Media playback state. */
export interface MediaState {
  status: 'playing' | 'paused' | 'stopped' | 'buffering';
  position?: number;
  duration?: number;
  volume?: number;
}

/** Media action supported by a session or requested by a controller. */
export type MediaAction = 'play' | 'pause' | 'stop' | 'next' | 'prev' | 'seek' | 'volume';

interface MediaSessionCreateBase {
  sessionId?: string;
  metadata?: MediaMetadata;
  capabilities?: MediaAction[];
  autoplay?: boolean;
  live?: boolean;
}

/** Ownership-aware media session creation options. */
export type MediaSessionCreate =
  | (MediaSessionCreateBase & {
      owner: 'shell';
      source: MediaSourceRef;
    })
  | (MediaSessionCreateBase & {
      owner: 'napplet';
      source?: MediaSourceRef;
    });

/** Result of a media session creation request. */
export interface MediaSessionResult {
  sessionId?: string;
  owner?: MediaPlaybackOwner;
  error?: string;
}

/**
 * A single MCP JSON-RPC message exchanged with a ContextVM server (NAP-CVM).
 * The embedded `id` is the JSON-RPC correlation id, independent of the NIP-5D
 * envelope id used to correlate `cvm.request` with `cvm.request.result`.
 */
export interface McpMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

/** An MCP tool definition, as returned by `tools/list`. */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/** A content block inside an MCP tool result (text, image, resource, ...). */
export interface McpContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/** The result of an MCP `tools/call`. */
export interface McpToolResult {
  content: McpContentBlock[];
  isError?: boolean;
  [key: string]: unknown;
}

/** An MCP resource descriptor, as returned by `resources/list`. */
export interface McpResource {
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  size?: number;
}

/** Text contents of an MCP resource (`resources/read`). */
export interface McpTextResourceContents {
  uri: string;
  mimeType?: string;
  text: string;
}

/** Binary contents of an MCP resource (`resources/read`); `blob` is base64-encoded. */
export interface McpBlobResourceContents {
  uri: string;
  mimeType?: string;
  blob: string;
}

/** A single MCP resource content entry: either text or base64 blob. */
export type McpResourceContent = McpTextResourceContents | McpBlobResourceContents;

/** Identifies a ContextVM server by Nostr public key, with optional relay hints. */
export interface CvmServerRef {
  pubkey: string;
  relays?: string[];
}

/** Filter for ContextVM server discovery. */
export interface CvmDiscoverQuery {
  search?: string;
  kinds?: number[];
  relays?: string[];
  limit?: number;
}

/** A discovered ContextVM server announcement. */
export interface CvmServer extends CvmServerRef {
  name?: string;
  description?: string;
  capabilities?: string[];
  paymentRequired?: boolean;
}

/** Per-request options for ContextVM operations. */
export interface CvmRequestOptions {
  timeoutMs?: number;
  initialize?: boolean;
  payment?: 'deny' | 'prompt' | 'allow';
}

/** Relay-selection strategy for outbox-model routing (NAP-OUTBOX). */
export type OutboxStrategy = 'outbox' | 'inbox' | 'auto';

/** Options for a one-shot outbox query. */
export interface OutboxQueryOptions {
  authors?: string[];
  relays?: string[];
  strategy?: OutboxStrategy;
  limit?: number;
  timeoutMs?: number;
}

/** Options for a live outbox subscription. */
export interface OutboxSubscribeOptions extends OutboxQueryOptions {
  live?: boolean;
}

/** Options for an outbox publish. */
export interface OutboxPublishOptions {
  relays?: string[];
  targetAuthors?: string[];
  strategy?: OutboxStrategy;
}

/** A read/write target for outbox relay-plan resolution. */
export interface OutboxTarget {
  authors?: string[];
  pubkey?: string;
  direction?: 'read' | 'write';
  strategy?: OutboxStrategy;
}

/** The relay plan the shell would use for an outbox target. */
export interface OutboxRelayPlan {
  relays: string[];
  source: 'nip65' | 'cache' | 'policy' | 'fallback';
  missingAuthors?: string[];
}

/** The result of an outbox query. */
export interface OutboxResult {
  events: NostrEvent[];
  relays: Record<string, string[]>;
  incomplete?: boolean;
  error?: string;
}

/** The result of an outbox publish. */
export interface OutboxPublishResult {
  ok: boolean;
  event?: NostrEvent;
  eventId?: string;
  relays?: Record<string, boolean>;
  error?: string;
}

/** Handle for a live outbox subscription. */
export interface OutboxSubscription {
  on(event: 'event', cb: (event: NostrEvent, relay?: string) => void): void;
  on(event: 'eose', cb: () => void): void;
  on(event: 'closed', cb: (reason?: string) => void): void;
  close(): void;
}

/** A single Nostr tag (NIP-94 / imeta entries are arrays of strings). */
export type NostrTag = string[];

/** Storage rail for shell-mediated uploads (NAP-UPLOAD). */
export type UploadRail = 'nip96' | 'blossom' | (string & {});

/** Lifecycle state of an upload. */
export type UploadState = 'pending' | 'uploading' | 'complete' | 'failed' | 'cancelled';

/** A napplet's upload request; `data` crosses the boundary by structured clone. */
export interface UploadRequest {
  rail?: UploadRail;
  data: Blob | ArrayBuffer;
  mimeType?: string;
  filename?: string;
  caption?: string;
  noTransform?: boolean;
  metadata?: Record<string, unknown>;
}

/** The result of an upload. */
export interface UploadResult {
  ok: boolean;
  uploadId: string;
  status: UploadState;
  rail: UploadRail;
  url?: string;
  fallbackUrls?: string[];
  sha256?: string;
  originalSha256?: string;
  size?: number;
  mimeType?: string;
  dimensions?: { width: number; height: number };
  blurhash?: string;
  nip94?: NostrTag[];
  error?: string;
}

/** A status snapshot for an upload, including progress counters. */
export interface UploadStatus extends UploadResult {
  bytesSent?: number;
  bytesTotal?: number;
  updatedAt: number;
}

/** How the shell should pick the handling napplet for an intent (NAP-INTENT). */
export type IntentHandlerPreference = 'default' | 'choose' | (string & {});

/** Window behavior hints for an intent invoke. */
export interface IntentBehavior {
  focus?: boolean;
  newWindow?: boolean;
  reuse?: boolean;
}

/** A request to dispatch an action to a napplet of a given archetype. */
export interface IntentRequest {
  archetype: string;
  action?: string;
  protocol?: string;
  payload?: unknown;
  handler?: IntentHandlerPreference;
  behavior?: IntentBehavior;
}

/** A napplet that can fulfill an archetype (from the manifest catalog). */
export interface IntentCandidate {
  dTag: string;
  title?: string;
  actions: string[];
  protocols: string[];
  isDefault?: boolean;
}

/** Availability of an archetype, sourced from the installed-napplet catalog. */
export interface IntentAvailability {
  archetype: string;
  available: boolean;
  candidates: IntentCandidate[];
  hasDefault: boolean;
}

/** The result of an intent invocation. */
export interface IntentResult {
  ok: boolean;
  archetype: string;
  action: string;
  handled: boolean;
  handler?: string;
  windowId?: string;
  protocol?: string;
  error?: string;
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
   * Inter-napplet pubsub: broadcast and receive INC-PEER events through the shell.
   */
  inc: {
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
   *   owner: 'napplet',
   *   metadata: { title: 'My Song', artist: 'The Artist' },
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
     * @param options  Ownership-aware session options.
     * @returns The shell result with canonical sessionId and owner, or error.
     */
    createSession(options: MediaSessionCreate): Promise<MediaSessionResult>;
    /**
     * Update metadata for an existing session. Partial updates supported.
     * @param sessionId  The session to update
     * @param metadata   Partial metadata fields to update
     */
    updateSession(sessionId: string, metadata: Partial<MediaMetadata>): void;
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
    reportState(sessionId: string, state: MediaState): void;
    /**
     * Declare which media actions the session currently supports.
     * @param sessionId  The session to update capabilities for
     * @param actions    Currently supported actions
     */
    reportCapabilities(sessionId: string, actions: MediaAction[]): void;
    /**
     * Send a command to the current playback owner.
     * @param sessionId  The session to control
     * @param action     The media action to request
     * @param value      Optional value for seek/volume
     */
    sendCommand(sessionId: string, action: MediaAction, value?: number): void;
    /**
     * Listen for media commands from the shell.
     * @param sessionId  The session to listen for commands on
     * @param callback   Called with (action, value?) when a command is received
     * @returns A Subscription with `close()` to stop listening
     */
    onCommand(sessionId: string, callback: (action: MediaAction, value?: number) => void): Subscription;
    /**
     * Listen for shell-reported playback state for shell-owned sessions.
     * @param sessionId  The session to listen for state on
     * @param callback   Called with playback state
     * @returns A Subscription with `close()` to stop listening
     */
    onState(sessionId: string, callback: (state: MediaState) => void): Subscription;
    /**
     * Listen for shell-reported capabilities for shell-owned sessions.
     * @param sessionId  The session to listen for capabilities on
     * @param callback   Called with available actions
     * @returns A Subscription with `close()` to stop listening
     */
    onCapabilities(sessionId: string, callback: (actions: MediaAction[]) => void): Subscription;
    /**
     * Listen for the shell's media control list.
     * @param sessionId  The session to associate controls with
     * @param callback   Called with the shell's supported controls
     * @returns A Subscription with `close()` to stop listening
     */
    onControls(sessionId: string, callback: (controls: MediaAction[]) => void): Subscription;
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
    /**
     * Listen for shell-pushed user identity changes.
     * The callback receives a hex pubkey, or "" when no user/signer is connected.
     */
    onChanged(handler: (pubkey: string) => void): Subscription;
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
  };
  /**
   * Read-only access to the shell's active theme (NAP-THEME).
   *
   * The shell owns theming; napplets read the current theme and react to
   * shell-pushed changes. The payload carries required colors plus optional
   * fonts, background media, and a title.
   *
   * @example
   * ```ts
   * const theme = await window.napplet.theme.get();
   * document.body.style.background = theme.colors.background;
   * const sub = window.napplet.theme.onChanged((t) => applyTheme(t));
   * ```
   */
  theme: {
    /** Get the shell's current active theme. */
    get(): Promise<{
      colors: { background: string; text: string; primary: string };
      fonts?: {
        body?: { name: string; url: string };
        title?: { name: string; url: string };
      };
      background?: { url: string; mode: string; mime: string };
      title?: string;
    }>;
    /** Listen for shell-pushed theme changes. */
    onChanged(
      handler: (theme: {
        colors: { background: string; text: string; primary: string };
        fonts?: {
          body?: { name: string; url: string };
          title?: { name: string; url: string };
        };
        background?: { url: string; mode: string; mime: string };
        title?: string;
      }) => void,
    ): Subscription;
  };
  /**
   * Per-napplet declarative configuration (NAP-CONFIG).
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
   * advertise `nap:connect`, does not inject the meta tag, or denies the grant.
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
   * // Capability-check the shell for the NAP itself:
   * if (window.napplet.shell.supports('nap:connect')) { ... }
   * ```
   */
  connect: {
    /**
     * True when the shell has granted the napplet direct network access to at
     * least one origin declared in its manifest `connect` tags. False when
     * denied, ungranted, or when the shell does not implement `nap:connect`.
     */
    readonly granted: boolean;
    /**
     * Readonly list of origins for which the shell emitted `connect-src` entries.
     * Empty when `granted` is false. Origin format matches CSP source-expression
     * rules: scheme + host + optional non-default port, no path/query/fragment,
     * lowercase host, Punycode for IDN. See NAP-CONNECT spec for normalization.
     */
    readonly origins: readonly string[];
  };
  /**
   * Shell-assigned napplet class (abstract security-posture identifier).
   *
   * Populated by the NAP-CLASS wire message `class.assigned` (shell -> napplet,
   * one terminal envelope per lifecycle) after iframe ready. The runtime value
   * is a plain `number`, not a literal union — the class space is extensible
   * as new NAP-CLASS-$N sub-track members are defined. Current canonical
   * classes (defined in the NAP-CLASS track): `1` (strict baseline, no
   * user-declared origins) and `2` (user-approved explicit-origin CSP).
   *
   * `undefined` in three distinct states, all of which napplets MUST handle
   * gracefully:
   * 1. Before the shell has sent `class.assigned` (early bootstrap).
   * 2. When the shell does not implement `nap:class` (capability missing).
   * 3. When the shell implements the NAP but intentionally withholds assignment.
   *
   * Cross-NAP invariant (in shells implementing both NAP-CONNECT and NAP-CLASS):
   * `class === 2` iff `window.napplet.connect.granted === true`. See
   * `specs/SHELL-CLASS-POLICY.md` (Phase 140) for the full shell-responsibility
   * matrix.
   *
   * @example
   * ```ts
   * // Capability-check before branching on class:
   * if (window.napplet.shell.supports('nap:class') && window.napplet.class !== undefined) {
   *   console.log(`napplet running as class ${window.napplet.class}`);
   * } else {
   *   // Shell does not implement nap:class or assignment has not arrived;
   *   // fall back to feature detection (e.g., window.napplet.connect.granted).
   * }
   * ```
   */
  class?: number;
  /**
   * Native ContextVM bridge (NAP-CVM): MCP-over-Nostr access mediated by the shell.
   *
   * ContextVM transports Model Context Protocol JSON-RPC over Nostr relays using
   * public-key server addressing and encrypted relay events. The shell owns all
   * transport details -- relay routing, signing, encryption, JSON-RPC correlation,
   * MCP initialization, per-napplet policy, and optional payment prompts. Napplets
   * supply a server identity (`pubkey` + optional relay hints) and the MCP
   * operation they want; they receive MCP results, never ContextVM private keys,
   * relay credentials, or direct socket access.
   *
   * @example
   * ```ts
   * if (window.napplet.shell.supports('cvm')) {
   *   const servers = await window.napplet.cvm.discover({ search: 'relay' });
   *   const tools = await window.napplet.cvm.listTools(servers[0]);
   *   const result = await window.napplet.cvm.callTool(servers[0], tools[0].name, {});
   * }
   * ```
   */
  cvm: {
    /**
     * Discover public ContextVM servers known to the shell.
     * @param query  Optional discovery filter (search, kinds, relays, limit)
     * @returns Promise resolving to the discovered servers
     */
    discover(query?: CvmDiscoverQuery): Promise<CvmServer[]>;
    /**
     * Send a raw MCP JSON-RPC message to a ContextVM server and resolve with the
     * matching MCP response. The shell wraps the message in ContextVM transport.
     * @param server   Target ContextVM server
     * @param message  MCP JSON-RPC message to deliver
     * @param options  Optional per-request options
     * @returns Promise resolving to the MCP response message
     */
    request(server: CvmServerRef, message: McpMessage, options?: CvmRequestOptions): Promise<McpMessage>;
    /**
     * List the tools exposed by a ContextVM server (MCP `tools/list`).
     * @param server   Target ContextVM server
     * @param options  Optional per-request options
     */
    listTools(server: CvmServerRef, options?: CvmRequestOptions): Promise<McpTool[]>;
    /**
     * Call a tool on a ContextVM server (MCP `tools/call`).
     * @param server   Target ContextVM server
     * @param name     Tool name
     * @param args     Tool arguments
     * @param options  Optional per-request options
     */
    callTool(server: CvmServerRef, name: string, args?: Record<string, unknown>, options?: CvmRequestOptions): Promise<McpToolResult>;
    /**
     * List the resources exposed by a ContextVM server (MCP `resources/list`).
     * @param server   Target ContextVM server
     * @param options  Optional per-request options
     */
    listResources(server: CvmServerRef, options?: CvmRequestOptions): Promise<McpResource[]>;
    /**
     * Read a resource from a ContextVM server (MCP `resources/read`).
     * Resolves with the first content entry per the NAP-CVM API surface.
     * @param server   Target ContextVM server
     * @param uri      Resource URI
     * @param options  Optional per-request options
     */
    readResource(server: CvmServerRef, uri: string, options?: CvmRequestOptions): Promise<McpResourceContent>;
    /**
     * Close shell-maintained session state for a server (subscriptions, cached
     * initialization state, pending correlation records).
     * @param server  Server whose session should be torn down
     */
    close(server: CvmServerRef): Promise<void>;
    /**
     * Listen for server-pushed MCP messages (`cvm.event`) -- notifications and
     * unsolicited server messages not correlated to a single request.
     * @param callback  Called with `(server, message)` for each server event
     * @returns A Subscription with `close()` to stop listening
     */
    onEvent(callback: (server: CvmServerRef, message: McpMessage) => void): Subscription;
  };
  /**
   * Outbox-aware relay routing (NAP-OUTBOX): the napplet supplies Nostr filters
   * and intent; the shell discovers the correct relays (NIP-65 write/read relays,
   * fallbacks, relay intelligence), queries them, deduplicates events by id,
   * validates signatures, and streams updates. The shell owns relay discovery,
   * routing, fallback, deduplication, signing, and publish fanout policy.
   *
   * Use this instead of NAP-RELAY when relay selection is part of result
   * correctness (reading an author's notes from their write relays, publishing to
   * the user's write relays, fanning a directed event to recipient inbox relays).
   *
   * @example
   * ```ts
   * if (window.napplet.shell.supports('outbox')) {
   *   const { events } = await window.napplet.outbox.query(
   *     [{ authors: ['ab12...'], kinds: [1], limit: 20 }],
   *     { strategy: 'outbox' },
   *   );
   * }
   * ```
   */
  outbox: {
    /**
     * Perform a one-shot outbox-aware query. The shell resolves relays, queries
     * them, deduplicates by event id, and validates signatures. Partial results
     * carry `incomplete: true`; a query-level failure arrives as inline `error`.
     * @param filters  NIP-01 filter or filters
     * @param options  Optional query options (authors, relays, strategy, limit, timeoutMs)
     * @returns Promise resolving to the outbox result
     */
    query(filters: NostrFilter | NostrFilter[], options?: OutboxQueryOptions): Promise<OutboxResult>;
    /**
     * Open a live outbox-aware subscription. The shell may add/remove relay
     * connections as NIP-65 relay lists change.
     * @param filters  NIP-01 filter or filters
     * @param options  Optional subscribe options (adds `live`)
     * @returns An OutboxSubscription handle with `on(...)` and `close()`
     */
    subscribe(filters: NostrFilter | NostrFilter[], options?: OutboxSubscribeOptions): OutboxSubscription;
    /**
     * Publish a shell-signed event using outbox-aware relay fanout.
     * @param template  Unsigned event template; the shell signs before fanout
     * @param options   Optional publish options (relays, targetAuthors, strategy)
     * @returns Promise resolving to the outbox publish result
     */
    publish(template: EventTemplate, options?: OutboxPublishOptions): Promise<OutboxPublishResult>;
    /**
     * Resolve the relay plan the shell would use for a read/write target.
     * Useful for diagnostics/UI; prefer query/subscribe/publish for access.
     * @param target  The read/write target (authors/pubkey, direction, strategy)
     * @returns Promise resolving to the relay plan
     */
    resolveRelays(target: OutboxTarget): Promise<OutboxRelayPlan>;
  };
  /**
   * Shell-mediated file/blob upload (NAP-UPLOAD): the napplet hands the shell raw
   * bytes plus upload intent; the shell selects a storage server, signs the rail
   * authorization (NIP-98 for NIP-96, kind 24242 for Blossom), performs the HTTP
   * upload, and returns a stable URL plus NIP-94 integrity metadata. The shell is
   * the policy and consent boundary; napplets never receive signing keys, server
   * credentials, or direct network access.
   *
   * @example
   * ```ts
   * if (window.napplet.shell.supports('upload')) {
   *   const result = await window.napplet.upload.upload({ data: blob, filename: 'pic.png' });
   *   if (result.status === 'complete') attach(result.url, result.nip94);
   * }
   * ```
   */
  upload: {
    /**
     * Upload bytes. The shell handles consent, server selection, rail auth
     * signing, and the HTTP upload, then resolves with the initial result.
     * Large/async uploads resolve with `status: "uploading"` and report progress
     * via `onStatus`. Resolves with the result even on `ok: false`
     * (created-then-failed/cancelled); rejects only on a top-level error.
     * @param request  The upload request (Blob/ArrayBuffer bytes + intent)
     * @returns Promise resolving to the initial upload result
     */
    upload(request: UploadRequest): Promise<UploadResult>;
    /**
     * Get the latest known status for a prior upload, including progress counters.
     * @param uploadId  The shell-generated id from a prior upload
     * @returns Promise resolving to the latest status
     */
    status(uploadId: string): Promise<UploadStatus>;
    /**
     * Register for shell-pushed status updates (progress, complete/failed).
     * @param handler  Called with each new UploadStatus
     * @returns A Subscription with `close()` to stop listening
     */
    onStatus(handler: (status: UploadStatus) => void): Subscription;
  };
  /**
   * Archetype intent dispatch (NAP-INTENT): invoke another napplet by its role
   * (archetype) without addressing it directly. The napplet names a role +
   * action + payload; the shell resolves the role to an installed napplet
   * (honoring the user's default-handler preference), creates or focuses the
   * window, and delivers the payload using the named NAP-N protocol. Routing
   * (`archetype`) and payload format (`protocol`) are orthogonal. The shell owns
   * resolution, default handling, window lifecycle, and the trust boundary —
   * napplets never learn or address other napplets except through this resolution.
   *
   * @example
   * ```ts
   * if (window.napplet.shell.supports('intent')) {
   *   const { available } = await window.napplet.intent.available('note');
   *   if (available) await window.napplet.intent.open('note', { target: { type: 'event', id } });
   * }
   * ```
   */
  intent: {
    /**
     * Dispatch an action (default `open`) to a napplet of `request.archetype`.
     * Resolves with the structured result (including `ok: false`/`handled: false`
     * on failure); rejects only on a top-level error.
     * @param request  The intent request (archetype + action + payload + routing)
     * @returns Promise resolving to the invocation result
     */
    invoke(request: IntentRequest): Promise<IntentResult>;
    /**
     * Convenience sugar for `invoke({ archetype, action: 'open', payload, ...opts })`.
     * @param archetype  Role slug to open
     * @param payload    Opaque payload (typed by the resolved protocol)
     * @param opts       Extra request fields (protocol, handler, behavior)
     * @returns Promise resolving to the invocation result
     */
    open(archetype: string, payload?: unknown, opts?: Omit<IntentRequest, 'archetype' | 'action' | 'payload'>): Promise<IntentResult>;
    /**
     * Whether the runtime can currently satisfy `archetype`, with candidates and
     * the actions/protocols each supports. Sourced from the installed catalog.
     * @param archetype  Role slug to check
     * @returns Promise resolving to the archetype availability
     */
    available(archetype: string): Promise<IntentAvailability>;
    /**
     * Availability for every archetype the runtime can currently satisfy.
     * @returns Promise resolving to availability for each satisfiable archetype
     */
    handlers(): Promise<IntentAvailability[]>;
    /**
     * Register for shell-pushed availability updates (install/remove/default change).
     * @param handler  Called with each updated IntentAvailability
     * @returns A Subscription with `close()` to stop listening
     */
    onChanged(handler: (availability: IntentAvailability) => void): Subscription;
  };
  /**
   * Shell capability queries. Check whether the shell supports a NAP,
   * permission, or numbered NAP protocol.
   *
   * @example
   * ```ts
   * // NAP domain (bare shorthand or prefixed):
   * if (window.napplet.shell.supports('relay')) { ... }
   * if (window.napplet.shell.supports('nap:relay')) { ... }
   *
   * // Permission:
   * if (window.napplet.shell.supports('perm:popups')) { ... }
   *
   * // Numbered NAP protocol over an interface:
   * if (window.napplet.shell.supports('inc', 'NAP-01')) { ... }
   * ```
   */
  shell: NappletGlobalShell;
}
