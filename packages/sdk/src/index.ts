/**
 * @napplet/sdk -- Typed named exports wrapping window.napplet.
 *
 * Provides `relay`, `ifc`, `storage`, and `keys` objects that delegate
 * to `window.napplet.*` at call time. Developers using a bundler can import
 * individual namespaces without depending on the shim's side-effect install:
 *
 * ```ts
 * import { relay, ifc } from '@napplet/sdk';
 * ```
 *
 * The shim must still be imported somewhere in the application to install
 * the `window.napplet` global. The SDK only wraps it -- it does not install it.
 *
 * Domain-specific SDK helpers are also available directly from NUB packages:
 * ```ts
 * import { relaySubscribe } from '@napplet/nub/relay';
 * import { storageGetItem } from '@napplet/nub/storage';
 * ```
 *
 * @packageDocumentation
 */

import type {
  NappletGlobal,
  NostrEvent,
  NostrFilter,
  Subscription,
  EventTemplate,
} from '@napplet/core';
import type {
  MediaSessionCreate,
  MediaSessionResult,
  MediaMetadata,
  MediaState,
  MediaAction,
} from '@napplet/nub/media';

/**
 * Retrieve the `window.napplet` global, throwing a clear error if it is absent.
 *
 * Every SDK method calls this at invocation time -- not at module load time --
 * so the shim can be imported in any order relative to the SDK.
 */
function requireNapplet(): NappletGlobal {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet) {
    throw new Error('window.napplet not installed -- import @napplet/shim first');
  }
  return w.napplet;
}

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
 * Inter-frame pubsub: broadcast and receive IFC-PEER events through the shell.
 *
 * @example
 * ```ts
 * import { ifc } from '@napplet/sdk';
 *
 * ifc.emit('profile:open', [], JSON.stringify({ pubkey: '...' }));
 *
 * const sub = ifc.on('profile:open', (payload) => {
 *   console.log('Profile requested:', payload);
 * });
 * ```
 */
export const ifc = {
  /**
   * Broadcast an IFC-PEER event to other napplets via the shell.
   * @param topic      The 't' tag value (e.g., 'profile:open')
   * @param extraTags  Additional NIP-01 tags beyond the 't' tag (default: [])
   * @param content    Event content (default: empty string)
   */
  emit(topic: string, extraTags?: string[][], content?: string): void {
    requireNapplet().ifc.emit(topic, extraTags, content);
  },

  /**
   * Subscribe to IFC-PEER events on a specific topic.
   * @param topic     The 't' tag value to listen for
   * @param callback  Called with `(payload, event)` for each matching event
   * @returns A Subscription handle with a `close()` method
   */
  on(
    topic: string,
    callback: (payload: unknown, event: NostrEvent) => void,
  ): Subscription {
    return requireNapplet().ifc.on(topic, callback);
  },
};

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
};

/**
 * Media session control: create sessions, report state and metadata,
 * declare capabilities, receive commands from the shell.
 *
 * @example
 * ```ts
 * import { media } from '@napplet/sdk';
 *
 * const { sessionId } = await media.createSession({
 *   owner: 'napplet',
 *   metadata: { title: 'My Song', artist: 'The Artist' },
 * });
 *
 * media.reportState(sessionId, { status: 'playing', position: 42.5 });
 * ```
 */
export const media = {
  /**
   * Create a new media session with the shell.
   * @param options  Ownership-aware session options
   * @returns The shell result with canonical sessionId and owner, or error
   */
  createSession(options: MediaSessionCreate): Promise<MediaSessionResult> {
    return requireNapplet().media.createSession(options);
  },

  /**
   * Update metadata for an existing session.
   * @param sessionId  The session to update
   * @param metadata   Partial metadata fields to update
   */
  updateSession(sessionId: string, metadata: Partial<MediaMetadata>): void {
    requireNapplet().media.updateSession(sessionId, metadata);
  },

  /**
   * Destroy a media session.
   * @param sessionId  The session to destroy
   */
  destroySession(sessionId: string): void {
    requireNapplet().media.destroySession(sessionId);
  },

  /**
   * Report current playback state for a session.
   * @param sessionId  The session to report state for
   * @param state      Current playback state
   */
  reportState(sessionId: string, state: MediaState): void {
    requireNapplet().media.reportState(sessionId, state);
  },

  /**
   * Declare which media actions the session currently supports.
   * @param sessionId  The session to update capabilities for
   * @param actions    Currently supported actions
   */
  reportCapabilities(sessionId: string, actions: MediaAction[]): void {
    requireNapplet().media.reportCapabilities(sessionId, actions);
  },

  /**
   * Send a command to the current playback owner.
   * @param sessionId  The session to control
   * @param action     The media action to request
   * @param value      Optional value for seek/volume
   */
  sendCommand(sessionId: string, action: MediaAction, value?: number): void {
    requireNapplet().media.sendCommand(sessionId, action, value);
  },

  /**
   * Listen for media commands from the shell.
   * @param sessionId  The session to listen for commands on
   * @param callback   Called with (action, value?) when a command is received
   * @returns A Subscription with `close()` to stop listening
   */
  onCommand(
    sessionId: string,
    callback: (action: MediaAction, value?: number) => void,
  ): Subscription {
    return requireNapplet().media.onCommand(sessionId, callback);
  },

  /**
   * Listen for shell-reported playback state for shell-owned sessions.
   * @param sessionId  The session to listen for state on
   * @param callback   Called with playback state
   * @returns A Subscription with `close()` to stop listening
   */
  onState(
    sessionId: string,
    callback: (state: MediaState) => void,
  ): Subscription {
    return requireNapplet().media.onState(sessionId, callback);
  },

  /**
   * Listen for shell-reported capabilities for shell-owned sessions.
   * @param sessionId  The session to listen for capabilities on
   * @param callback   Called with available actions
   * @returns A Subscription with `close()` to stop listening
   */
  onCapabilities(
    sessionId: string,
    callback: (actions: MediaAction[]) => void,
  ): Subscription {
    return requireNapplet().media.onCapabilities(sessionId, callback);
  },

  /**
   * Listen for the shell's media control list.
   * @param sessionId  The session to associate controls with
   * @param callback   Called with the shell's supported controls
   * @returns A Subscription with `close()` to stop listening
   */
  onControls(
    sessionId: string,
    callback: (controls: MediaAction[]) => void,
  ): Subscription {
    return requireNapplet().media.onControls(sessionId, callback);
  },
};

/**
 * Shell-rendered notifications: send notifications, set badge counts,
 * register channels, request permission, listen for user interaction.
 *
 * @example
 * ```ts
 * import { notify } from '@napplet/sdk';
 *
 * const { notificationId } = await notify.send({
 *   title: 'New message', body: 'Alice: hey!',
 * });
 *
 * notify.badge(3);
 * ```
 */
export const notify = {
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
  }): Promise<{ notificationId: string }> {
    return requireNapplet().notify.send(notification);
  },

  /**
   * Dismiss a notification by ID.
   * @param notificationId  The notification to dismiss
   */
  dismiss(notificationId: string): void {
    requireNapplet().notify.dismiss(notificationId);
  },

  /**
   * Set the badge count for this napplet. Pass 0 to clear.
   * @param count  Badge count
   */
  badge(count: number): void {
    requireNapplet().notify.badge(count);
  },

  /**
   * Register a notification channel.
   * @param channel  Channel definition
   */
  registerChannel(channel: {
    channelId: string;
    label: string;
    description?: string;
    defaultPriority?: 'low' | 'normal' | 'high' | 'urgent';
  }): void {
    requireNapplet().notify.registerChannel(channel);
  },

  /**
   * Request permission to send notifications.
   * @param channel  Optional channel to request permission for
   * @returns Whether permission was granted
   */
  requestPermission(channel?: string): Promise<{ granted: boolean }> {
    return requireNapplet().notify.requestPermission(channel);
  },

  /**
   * Listen for action button clicks on notifications.
   * @param callback  Called with (notificationId, actionId)
   * @returns A Subscription with `close()` to stop listening
   */
  onAction(
    callback: (notificationId: string, actionId: string) => void,
  ): Subscription {
    return requireNapplet().notify.onAction(callback);
  },

  /**
   * Listen for notification body clicks.
   * @param callback  Called with (notificationId)
   * @returns A Subscription with `close()` to stop listening
   */
  onClicked(
    callback: (notificationId: string) => void,
  ): Subscription {
    return requireNapplet().notify.onClicked(callback);
  },

  /**
   * Listen for notification dismissals.
   * @param callback  Called with (notificationId, reason?)
   * @returns A Subscription with `close()` to stop listening
   */
  onDismissed(
    callback: (notificationId: string, reason?: string) => void,
  ): Subscription {
    return requireNapplet().notify.onDismissed(callback);
  },

  /**
   * Listen for the shell's notification capability list.
   * @param callback  Called with supported controls
   * @returns A Subscription with `close()` to stop listening
   */
  onControls(
    callback: (controls: ('toasts' | 'badges' | 'actions' | 'channels' | 'system')[]) => void,
  ): Subscription {
    return requireNapplet().notify.onControls(callback);
  },
};

/**
 * Keyboard forwarding and action keybindings: register named actions the shell
 * can bind to keys, listen for shell-triggered actions locally.
 *
 * @example
 * ```ts
 * import { keys } from '@napplet/sdk';
 *
 * const result = await keys.registerAction({
 *   id: 'editor.save',
 *   label: 'Save',
 *   defaultKey: 'Ctrl+S',
 * });
 *
 * const sub = keys.onAction('editor.save', () => {
 *   console.log('Save triggered!');
 * });
 * ```
 */
export const keys = {
  /**
   * Declare a named action that the shell can bind to a key.
   * @param action  The action to register (id, label, optional defaultKey)
   * @returns The assigned binding, if any
   */
  registerAction(action: {
    id: string;
    label: string;
    defaultKey?: string;
  }): Promise<{ actionId: string; binding?: string }> {
    return requireNapplet().keys.registerAction(action);
  },

  /**
   * Remove a previously registered action.
   * @param actionId  The action to unregister
   */
  unregisterAction(actionId: string): void {
    requireNapplet().keys.unregisterAction(actionId);
  },

  /**
   * Register a local handler for when a bound key is pressed.
   * @param actionId  The action to listen for
   * @param callback  Called when the action is triggered
   * @returns A Subscription with `close()` to stop listening
   */
  onAction(actionId: string, callback: () => void): Subscription {
    return requireNapplet().keys.onAction(actionId, callback);
  },

  /**
   * Convenience: register a named action AND wire a local handler in one call.
   * Returns a handle whose `close()` both unregisters the action and removes
   * the onAction listener.
   *
   * @param action   The action to register (id, label, optional defaultKey)
   * @param handler  Called when the shell triggers this action
   * @returns The assigned binding plus a `close()` teardown function
   *
   * @example
   * ```ts
   * import { keys } from '@napplet/sdk';
   *
   * const handle = await keys.register(
   *   { id: 'editor.save', label: 'Save', defaultKey: 'Ctrl+S' },
   *   () => saveDocument(),
   * );
   *
   * // Later, tear down both registration and listener:
   * handle.close();
   * ```
   */
  async register(
    action: { id: string; label: string; defaultKey?: string },
    handler: () => void,
  ): Promise<{ actionId: string; binding?: string; close: () => void }> {
    const n = requireNapplet();
    const result = await n.keys.registerAction(action);
    const sub = n.keys.onAction(action.id, handler);
    return {
      ...result,
      close() {
        sub.close();
        n.keys.unregisterAction(action.id);
      },
    };
  },
};

/**
 * Read-only user identity queries: public key, profile, follows, relays,
 * lists, zaps, mutes, blocked, badges.
 *
 * @example
 * ```ts
 * import { identity } from '@napplet/sdk';
 *
 * const pubkey = await identity.getPublicKey();
 * const profile = await identity.getProfile();
 * const follows = await identity.getFollows();
 * ```
 */
export const identity = {
  /**
   * Get the user's hex-encoded public key. Always succeeds.
   * @returns Hex-encoded public key string
   */
  getPublicKey(): Promise<string> {
    return requireNapplet().identity.getPublicKey();
  },

  /**
   * Listen for shell-pushed user identity changes.
   * @param handler  Called with a hex pubkey, or "" when no user/signer is connected
   * @returns Subscription with close() to detach the handler
   */
  onChanged(handler: (pubkey: string) => void): Subscription {
    return requireNapplet().identity.onChanged(handler);
  },

  /**
   * Get the user's relay list (NIP-65).
   * @returns Record mapping relay URLs to read/write permissions
   */
  getRelays(): Promise<Record<string, { read: boolean; write: boolean }>> {
    return requireNapplet().identity.getRelays();
  },

  /**
   * Get the user's profile metadata (kind 0).
   * @returns Profile data, or null if not found
   */
  getProfile(): Promise<{
    name?: string;
    displayName?: string;
    about?: string;
    picture?: string;
    banner?: string;
    nip05?: string;
    lud16?: string;
    website?: string;
  } | null> {
    return requireNapplet().identity.getProfile();
  },

  /**
   * Get the user's follow list (kind 3 contact list).
   * @returns Array of hex-encoded public keys
   */
  getFollows(): Promise<string[]> {
    return requireNapplet().identity.getFollows();
  },

  /**
   * Get entries from a user's categorized list.
   * @param listType  List category (e.g., "bookmarks", "interests", "pins")
   * @returns Array of list entry values
   */
  getList(listType: string): Promise<string[]> {
    return requireNapplet().identity.getList(listType);
  },

  /**
   * Get zap receipts sent to the user.
   * @returns Array of zap receipt objects
   */
  getZaps(): Promise<{
    eventId: string;
    sender: string;
    amount: number;
    content?: string;
  }[]> {
    return requireNapplet().identity.getZaps();
  },

  /**
   * Get the user's mute list (kind 10000).
   * @returns Array of hex-encoded muted public keys
   */
  getMutes(): Promise<string[]> {
    return requireNapplet().identity.getMutes();
  },

  /**
   * Get the user's block list.
   * @returns Array of hex-encoded blocked public keys
   */
  getBlocked(): Promise<string[]> {
    return requireNapplet().identity.getBlocked();
  },

  /**
   * Get badges awarded to the user (NIP-58).
   * @returns Array of badge objects
   */
  getBadges(): Promise<{
    id: string;
    name?: string;
    description?: string;
    image?: string;
    thumbs?: string[];
    awardedBy: string;
  }[]> {
    return requireNapplet().identity.getBadges();
  },
};

/**
 * Per-napplet declarative configuration (NAP-CONFIG): register a schema,
 * read current values, subscribe to live updates, deep-link into the
 * shell-owned settings UI, and listen for schema errors.
 *
 * @example
 * ```ts
 * import { config } from '@napplet/sdk';
 *
 * await config.registerSchema({
 *   type: 'object',
 *   properties: { theme: { type: 'string', enum: ['light', 'dark'], default: 'dark' } },
 * });
 *
 * const sub = config.subscribe((values) => { applyTheme(values.theme); });
 *
 * config.openSettings({ section: 'appearance' });
 * ```
 */
export const config = {
  /**
   * Snapshot current validated + defaulted config values.
   * @returns A one-shot ConfigValues object.
   */
  get(): Promise<Record<string, unknown>> {
    return requireNapplet().config.get();
  },

  /**
   * Subscribe to live configuration updates.
   * First delivery is an immediate snapshot; subsequent deliveries fire on change.
   * @param callback  Invoked with the full ConfigValues on every change.
   * @returns A Subscription with close() to stop listening.
   */
  subscribe(
    callback: (values: Record<string, unknown>) => void,
  ): Subscription {
    return requireNapplet().config.subscribe(callback);
  },

  /**
   * Request the shell open its settings UI for this napplet.
   * @param options  Optional { section } to deep-link by x-napplet-section name.
   */
  openSettings(options?: { section?: string }): void {
    requireNapplet().config.openSettings(options);
  },

  /**
   * Register a napplet configuration schema at runtime (escape hatch;
   * prefer manifest-declared via @napplet/vite-plugin's configSchema option).
   * @param schema   JSON Schema (draft-07+) describing the config surface.
   * @param version  Optional `$version` migration hint.
   */
  registerSchema(
    schema: Record<string, unknown>,
    version?: number,
  ): Promise<void> {
    return requireNapplet().config.registerSchema(schema, version);
  },

  /**
   * Listen for schema-registration errors pushed by the shell
   * (manifest parse failure, no-schema on subscribe-before-schema, etc.).
   * @param callback  Invoked with { code, error } on every push.
   * @returns A plain teardown function that detaches the listener.
   */
  onSchemaError(
    callback: (err: { code: string; error: string }) => void,
  ): () => void {
    return requireNapplet().config.onSchemaError(callback);
  },

  /**
   * Current schema snapshot (readonly). Populated from the
   * `<meta name="napplet-config-schema">` manifest tag at shim install,
   * updated on successful registerSchema responses.
   * @returns The registered schema, or null if none.
   */
  get schema(): Record<string, unknown> | null {
    return requireNapplet().config.schema;
  },
};

/**
 * Browser-enforced byte-fetching primitive: napplets request bytes by URL,
 * shell fetches and returns a Blob. URL space is scheme-pluggable
 * (`data:`, `https:`, `blossom:`, `nostr:`).
 *
 * @example
 * ```ts
 * import { resource } from '@napplet/sdk';
 *
 * const blob = await resource.bytes('https://example.com/avatar.png');
 * const handle = resource.bytesAsObjectURL('blossom:abc123...');
 * imgEl.src = handle.url;
 * imgEl.onload = () => handle.revoke();
 * ```
 */
export const resource = {
  /**
   * Fetch bytes for a URL through the shell's resource pipeline.
   * @param url  URL identifying the resource (any registered scheme).
   * @returns Promise resolving to the fetched bytes as a Blob.
   */
  bytes(url: string): Promise<Blob> {
    return requireNapplet().resource.bytes(url);
  },

  /**
   * Fetch bytes and return a managed object URL handle.
   * Call `revoke()` to release the underlying Blob URL.
   * @param url  URL identifying the resource.
   * @returns Synchronous handle `{ url, revoke }`.
   */
  bytesAsObjectURL(url: string): { url: string; revoke: () => void } {
    return requireNapplet().resource.bytesAsObjectURL(url);
  },
};

export type { NostrEvent } from '@napplet/core';
export type { NostrFilter } from '@napplet/core';
export type { Subscription } from '@napplet/core';
export type { EventTemplate } from '@napplet/core';

export type {
  NappletMessage,
  NapDomain,
  NubDomain,
  NamespacedCapability,
  NapProtocolId,
  NubProtocolId,
  ProtocolId,
  ShellSupports,
} from '@napplet/core';
export { NAP_DOMAINS, NUB_DOMAINS } from '@napplet/core';

// Relay NUB
export type {
  RelayMessage,
  RelaySubscribeMessage,
  RelayCloseMessage,
  RelayPublishMessage,
  RelayPublishEncryptedMessage,
  RelayQueryMessage,
  RelayEventMessage,
  RelayEoseMessage,
  RelayClosedMessage,
  RelayPublishResultMessage,
  RelayPublishEncryptedResultMessage,
  RelayQueryResultMessage,
  RelayOutboundMessage,
  RelayInboundMessage,
  RelayNubMessage,
} from '@napplet/nub/relay';

// Identity NUB
export type {
  ProfileData,
  ZapReceipt,
  Badge,
  RelayPermission as IdentityRelayPermission,
  IdentityMessage,
  IdentityGetPublicKeyMessage,
  IdentityGetRelaysMessage,
  IdentityGetProfileMessage,
  IdentityGetFollowsMessage,
  IdentityGetListMessage,
  IdentityGetZapsMessage,
  IdentityGetMutesMessage,
  IdentityGetBlockedMessage,
  IdentityGetBadgesMessage,
  IdentityGetPublicKeyResultMessage,
  IdentityGetRelaysResultMessage,
  IdentityGetProfileResultMessage,
  IdentityGetFollowsResultMessage,
  IdentityGetListResultMessage,
  IdentityGetZapsResultMessage,
  IdentityGetMutesResultMessage,
  IdentityGetBlockedResultMessage,
  IdentityGetBadgesResultMessage,
  IdentityChangedMessage,
  IdentityRequestMessage,
  IdentityResultMessage,
  IdentityNapMessage,
  IdentityNubMessage,
} from '@napplet/nub/identity';

// Storage NUB
export type {
  StorageMessage,
  StorageGetMessage,
  StorageSetMessage,
  StorageRemoveMessage,
  StorageKeysMessage,
  StorageGetResultMessage,
  StorageSetResultMessage,
  StorageRemoveResultMessage,
  StorageKeysResultMessage,
  StorageRequestMessage,
  StorageResultMessage,
  StorageNubMessage,
} from '@napplet/nub/storage';

// IFC NUB
export type {
  IfcMessage,
  IfcEmitMessage,
  IfcSubscribeMessage,
  IfcSubscribeResultMessage,
  IfcUnsubscribeMessage,
  IfcEventMessage,
  IfcChannelOpenMessage,
  IfcChannelOpenResultMessage,
  IfcChannelEmitMessage,
  IfcChannelEventMessage,
  IfcChannelBroadcastMessage,
  IfcChannelListMessage,
  IfcChannelListResultMessage,
  IfcChannelCloseMessage,
  IfcChannelClosedMessage,
  IfcTopicMessage,
  IfcChannelMessage,
  IfcOutboundMessage,
  IfcInboundMessage,
  IfcNubMessage,
} from '@napplet/nub/ifc';

// Theme NUB
export type {
  ThemeColors,
  ThemeFont,
  ThemeBackground,
  Theme,
  ThemeMessage,
  ThemeGetMessage,
  ThemeGetResultMessage,
  ThemeChangedMessage,
  ThemeRequestMessage,
  ThemeResultMessage,
  ThemeNubMessage,
} from '@napplet/nub/theme';

// Keys NUB
export type {
  Action,
  RegisterResult,
  KeyBinding,
  KeysMessage,
  KeysForwardMessage,
  KeysRegisterActionMessage,
  KeysRegisterActionResultMessage,
  KeysUnregisterActionMessage,
  KeysBindingsMessage,
  KeysActionMessage,
  KeysRequestMessage,
  KeysResultMessage,
  KeysNubMessage,
} from '@napplet/nub/keys';

// Media NAP
export type {
  MediaMetadata,
  MediaArtwork,
  MediaPlaybackOwner,
  MediaSourceRef,
  MediaSessionCreate,
  MediaSessionResult,
  MediaState,
  MediaAction,
  MediaMessage,
  MediaSessionCreateMessage,
  MediaSessionCreateResultMessage,
  MediaSessionUpdateMessage,
  MediaSessionDestroyMessage,
  MediaStateMessage,
  MediaCapabilitiesMessage,
  MediaCommandMessage,
  MediaControlsMessage,
  MediaRequestMessage,
  MediaResultMessage,
  MediaNapMessage,
  MediaNubMessage,
} from '@napplet/nub/media';

// Notify NUB
export type {
  NotificationPriority,
  NotificationAction,
  NotificationChannel,
  NotifyControl,
  NotifyMessage,
  NotifySendMessage,
  NotifySendResultMessage,
  NotifyDismissMessage,
  NotifyBadgeMessage,
  NotifyChannelRegisterMessage,
  NotifyPermissionRequestMessage,
  NotifyPermissionResultMessage,
  NotifyActionMessage,
  NotifyClickedMessage,
  NotifyDismissedMessage,
  NotifyControlsMessage,
  NotifyRequestMessage,
  NotifyResultMessage,
  NotifyNubMessage,
} from '@napplet/nub/notify';

// Config NUB
export type {
  NappletConfigSchema,
  ConfigSchema,
  ConfigValues,
  ConfigSchemaErrorCode,
  NappletConfigSchemaExtensions,
  ConfigMessage,
  ConfigRegisterSchemaMessage,
  ConfigGetMessage,
  ConfigSubscribeMessage,
  ConfigUnsubscribeMessage,
  ConfigOpenSettingsMessage,
  ConfigRegisterSchemaResultMessage,
  ConfigValuesMessage,
  ConfigSchemaErrorMessage,
  ConfigRequestMessage,
  ConfigResultMessage,
  ConfigNubMessage,
} from '@napplet/nub/config';

// Resource NUB
export type {
  ResourceErrorCode,
  ResourceScheme,
  ResourceMessage,
  ResourceBytesMessage,
  ResourceCancelMessage,
  ResourceBytesResultMessage,
  ResourceBytesErrorMessage,
  ResourceSidecarEntry,
  ResourceRequestMessage,
  ResourceResultMessage,
  ResourceNubMessage,
} from '@napplet/nub/resource';

// Connect NUB
export type {
  NappletConnect,
} from '@napplet/nub/connect';

// Class NUB
export type {
  ClassMessage,
  ClassAssignedMessage,
  NappletClass,
  ClassNubMessage,
} from '@napplet/nub/class';

export { DOMAIN as RELAY_DOMAIN } from '@napplet/nub/relay';
export { DOMAIN as IDENTITY_DOMAIN } from '@napplet/nub/identity';
export { DOMAIN as STORAGE_DOMAIN } from '@napplet/nub/storage';
export { DOMAIN as IFC_DOMAIN } from '@napplet/nub/ifc';
export { DOMAIN as THEME_DOMAIN } from '@napplet/nub/theme';
export { DOMAIN as KEYS_DOMAIN } from '@napplet/nub/keys';
export { DOMAIN as MEDIA_DOMAIN } from '@napplet/nub/media';
export { DOMAIN as NOTIFY_DOMAIN } from '@napplet/nub/notify';
export { DOMAIN as CONFIG_DOMAIN } from '@napplet/nub/config';
export { DOMAIN as RESOURCE_DOMAIN } from '@napplet/nub/resource';
export { DOMAIN as CONNECT_DOMAIN } from '@napplet/nub/connect';
export { DOMAIN as CLASS_DOMAIN } from '@napplet/nub/class';

export { installRelayShim } from '@napplet/nub/relay';
export { installIdentityShim } from '@napplet/nub/identity';
export { installStorageShim } from '@napplet/nub/storage';
export { installIfcShim } from '@napplet/nub/ifc';
export { installKeysShim } from '@napplet/nub/keys';
export { installMediaShim } from '@napplet/nub/media';
export { installNotifyShim } from '@napplet/nub/notify';
export { installConfigShim } from '@napplet/nub/config';
export { installResourceShim } from '@napplet/nub/resource';
export { installConnectShim } from '@napplet/nub/connect';
export { installClassShim } from '@napplet/nub/class';

export { relaySubscribe, relayPublish, relayPublishEncrypted, relayQuery } from '@napplet/nub/relay';
export {
  identityGetPublicKey,
  identityOnChanged,
  identityGetRelays,
  identityGetProfile,
  identityGetFollows,
  identityGetList,
  identityGetZaps,
  identityGetMutes,
  identityGetBlocked,
  identityGetBadges,
} from '@napplet/nub/identity';
export { storageGetItem, storageSetItem, storageRemoveItem, storageKeys } from '@napplet/nub/storage';
export { ifcEmit, ifcOn } from '@napplet/nub/ifc';
export { keysRegisterAction, keysUnregisterAction, keysOnAction, keysRegister } from '@napplet/nub/keys';
export { mediaCreateSession, mediaUpdateSession, mediaDestroySession, mediaReportState, mediaReportCapabilities, mediaSendCommand, mediaOnCommand, mediaOnState, mediaOnCapabilities, mediaOnControls } from '@napplet/nub/media';
export { notifySend, notifyDismiss, notifyBadge, notifyRegisterChannel, notifyRequestPermission, notifyOnAction, notifyOnClicked, notifyOnDismissed, notifyOnControls } from '@napplet/nub/notify';
export { resourceBytes, resourceBytesAsObjectURL } from '@napplet/nub/resource';
export { connectGranted, connectOrigins, normalizeConnectOrigin } from '@napplet/nub/connect';
export { getClass } from '@napplet/nub/class';
