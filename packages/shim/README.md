# @napplet/shim

> Runtime injection helper for napplet iframes. It installs selected `window.napplet` domain objects. No cryptographic dependencies -- the shim sends JSON envelope messages and the shell handles identity.

## Getting Started

### Prerequisites

- A shell host running a napplet protocol shell implementation

### How It Works

1. A runtime injects the prelude before napplet scripts execute
2. The runtime chooses which NAP domain objects to expose
3. `window.napplet` is populated with the selected domain objects
4. No `window.nostr` is installed -- signing and encryption are mediated by the shell via `relay.publish()` and `relay.publishEncrypted()`

### Installation

```bash
npm install @napplet/shim
```

## Quick Start

### Host-injected srcdoc prelude

Shells that construct `iframe.srcdoc` should use the npm package's browser
prelude artifact instead of requiring each napplet bundle to import the shim.
The prelude requires an explicit domain allowlist and installs only those
callable `window.napplet.<domain>` objects.

```ts
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { renderNappletRuntimePreludeCall } from '@napplet/shim/prelude';

const require = createRequire(import.meta.url);
const preludePath = require.resolve('@napplet/shim/prelude.global');
const preludeSource = readFileSync(preludePath, 'utf8');
const activatePrelude = renderNappletRuntimePreludeCall({
  domains: ['identity', 'storage', 'outbox'],
});

const srcdoc = html.replace(
  '<head>',
  `<head><script>${preludeSource}\n${activatePrelude}</script>`,
);
```

The global artifact exposes `globalThis.NappletShimPrelude.install({ domains })`.
`@napplet/shim/prelude` also exports `installNappletRuntimePrelude()` for
bundled host runtimes that can import ESM directly. JSR publishes the source ESM
helpers under `@napplet/shim/prelude`; the generated `prelude.global` artifact
is npm-only.

### Module import compatibility

The root `@napplet/shim` entry still keeps the older side-effect behavior for
tests and runtimes that already bundle the shim module.

```ts
import { installNappletGlobal } from '@napplet/shim';

// Runtime-side injection before napplet scripts execute.
installNappletGlobal({ domains: ['relay', 'storage', 'identity', 'inc'] });

// Subscribe to kind 1 notes
const sub = window.napplet.relay.subscribe(
  { kinds: [1], limit: 20 },
  (event) => console.log('New note:', event.content),
  () => console.log('End of stored events'),
);

// Publish a note (shell signs it)
const signed = await window.napplet.relay.publish({
  kind: 1,
  content: 'Hello from my napplet!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000),
});

// Listen for a local profile-open convention payload from other napplets
const incSub = window.napplet.inc.on('napplet:profile/open', (payload) => {
  console.log('Local profile-open payload:', payload);
});

// Use scoped storage (proxied through the shell)
await window.napplet.storage.setItem('theme', 'dark');
const theme = await window.napplet.storage.getItem('theme'); // 'dark'

// Register a keyboard action the shell can bind to a key
const result = await window.napplet.keys.registerAction({
  id: 'editor.save', label: 'Save', defaultKey: 'Ctrl+S',
});

// Listen for the bound key locally (zero-latency, no postMessage round-trip)
const keySub = window.napplet.keys.onAction('editor.save', () => {
  console.log('Save triggered!');
});

// Create a media session
const { sessionId } = await window.napplet.media.createSession({
  owner: 'napplet',
  metadata: { title: 'My Song', artist: 'The Artist' },
});

// Report playback state
window.napplet.media.reportState(sessionId, {
  status: 'playing', position: 42.5, duration: 240,
});

// Listen for shell media commands
const mediaSub = window.napplet.media.onCommand(sessionId, (action, value) => {
  if (action === 'pause') player.pause();
});

// Send a notification
const { notificationId } = await window.napplet.notify.send({
  title: 'New message', body: 'Alice: hey!', priority: 'normal',
});

// Set badge count
window.napplet.notify.badge(3);

// Listen for notification interactions
const notifySub = window.napplet.notify.onAction((notifId, actionId) => {
  if (actionId === 'reply') openReply(notifId);
});

// Get user identity (read-only)
const pubkey = await window.napplet.identity.getPublicKey();
const profile = await window.napplet.identity.getProfile();
const identitySub = window.napplet.identity.onChanged((nextPubkey) => {
  console.log(nextPubkey || 'signed out');
});

// Read per-napplet config (validated + defaulted by the shell)
const config = await window.napplet.config.get();
// Subscribe to live config updates
const configSub = window.napplet.config.subscribe((values) => {
  applyTheme(values.theme);
});
// Deep-link the shell's settings UI to a named section
window.napplet.config.openSettings({ section: 'appearance' });

// Fetch external bytes via the shell (CSP blocks direct <img src=externalUrl> / fetch())
const avatarBlob = await window.napplet.resource.bytes('https://example.com/avatar.png');
const resourceItems = await window.napplet.resource.bytesMany([
  'https://example.com/avatar.png',
  'blossom:sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
]);
const handle = window.napplet.resource.bytesAsObjectURL('blossom:sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
imgEl.src = handle.url;
// later: handle.revoke();

// Open a shell-mediated WebRTC data session
const { session } = await window.napplet.webrtc.open({
  scope: { type: 'direct', pubkey: 'abc123...' },
});
await window.napplet.webrtc.send(session.id, { body: 'hello' });
// Open a shell-mediated BLE session
const { session: bleSession } = await window.napplet.ble.open({ acceptAllDevices: true });
const bleServices = await window.napplet.ble.services(bleSession.id);
// Open an external URL through shell policy and opener isolation
await window.napplet.link.open('https://example.com/post/123', { label: 'Read post' });
// Mutate a supported NIP-51 list through the runtime
await window.napplet.lists.add({ type: 'mute-list' }, [
  { itemType: 'pubkey', value: 'abc123...' },
]);
// Open a shell-mediated serial session
const serialSession = await window.napplet.serial.open({ options: { baudRate: 115200 } });
await window.napplet.serial.write(serialSession.id, [112, 105, 110, 103, 10]);
const serialSub = window.napplet.serial.onEvent((event) => {
  console.log('serial event', event);
});

// Clean up
sub.close();
incSub.close();
identitySub.close();
keySub.close();
mediaSub.close();
notifySub.close();
configSub.close();
serialSub.close();
```

## Wire Format

The shim communicates with the shell using JSON envelope messages (`{ type: "domain.action", ...payload }`) as defined by NIP-5D.

### Outbound (napplet → shell)

Messages are posted to the shell through `@napplet/core`'s clone-safe
`sendEnvelope(window.parent, msg)` boundary. Framework reactive values (Svelte 5
`$state`, Vue `reactive`, Solid stores) that aren't structured-cloneable are
snapshotted on the failure path instead of throwing a swallowed `DataCloneError`
— see [`@napplet/core` boundary helpers](../core/README.md#boundary-helpers-clone-safety).
The wire payloads are unchanged plain envelopes:

```ts
{ type: 'relay.subscribe', id: string, subId: string, filters: NostrFilter[] }
{ type: 'relay.publish', id: string, event: EventTemplate }
{ type: 'relay.publishEncrypted', id: string, event: EventTemplate, recipient: string, encryption?: 'nip44' | 'nip04' }
{ type: 'relay.query', id: string, filters: NostrFilter[] }
{ type: 'relay.unsubscribe', subId: string }

{ type: 'identity.getPublicKey', id: string }
{ type: 'identity.changed', pubkey: string }
{ type: 'identity.getRelays', id: string }
{ type: 'identity.getProfile', id: string }
{ type: 'identity.getFollows', id: string }
{ type: 'identity.getList', id: string, listType: string }
{ type: 'identity.getZaps', id: string }
{ type: 'identity.getMutes', id: string }
{ type: 'identity.getBlocked', id: string }
{ type: 'identity.getBadges', id: string }

{ type: 'inc.emit', topic: string, payload?: unknown }
{ type: 'inc.subscribe', id: string, topic: string }
{ type: 'inc.unsubscribe', topic: string }

{ type: 'storage.get', id: string, key: string, scope?: 'shared' | 'instance' }
{ type: 'storage.set', id: string, key: string, value: string, scope?: 'shared' | 'instance' }
{ type: 'storage.remove', id: string, key: string, scope?: 'shared' | 'instance' }
{ type: 'storage.keys', id: string, scope?: 'shared' | 'instance' }

{ type: 'keys.forward', key: string, code: string, ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }
{ type: 'keys.registerAction', id: string, action: { id: string, label: string, defaultKey?: string } }
{ type: 'keys.unregisterAction', actionId: string }

{ type: 'media.session.create', id: string, owner: 'shell' | 'napplet', sessionId?: string, source?: object, metadata?: object, capabilities?: string[], autoplay?: boolean, live?: boolean }
{ type: 'media.session.update', sessionId: string, metadata: object }
{ type: 'media.session.destroy', sessionId: string }
{ type: 'media.state', sessionId: string, status: string, position?: number, duration?: number, volume?: number }
{ type: 'media.capabilities', sessionId: string, actions: string[] }
{ type: 'media.command', sessionId: string, action: string, value?: number }

{ type: 'notify.send', id: string, title: string, body?: string, icon?: string, actions?: object[], channel?: string, priority?: string }
{ type: 'notify.dismiss', notificationId: string }
{ type: 'notify.badge', count: number }
{ type: 'notify.channel.register', channelId: string, label: string, description?: string, defaultPriority?: string }
{ type: 'notify.permission.request', id: string, channel?: string }

{ type: 'config.registerSchema', id: string, schema: object, version?: number }
{ type: 'config.get', id: string }
{ type: 'config.subscribe' }
{ type: 'config.unsubscribe' }
{ type: 'config.openSettings', section?: string }

{ type: 'resource.bytes', id: string, url: string }
{ type: 'resource.bytesMany', id: string, urls: string[] }
{ type: 'resource.cancel', id: string }

{ type: 'link.open', id: string, url: string, options?: { label?: string } }
{ type: 'lists.supported', id: string }
{ type: 'lists.add', id: string, list: object, items: object[], options?: object }
{ type: 'lists.remove', id: string, list: object, items: object[], options?: object }
{ type: 'serial.open', id: string, request: object }
{ type: 'serial.write', id: string, sessionId: string, data: number[] }
{ type: 'serial.close', id: string, sessionId: string, reason?: string }
```

### Inbound (shell → napplet)

Messages received via `window.addEventListener('message', ...)`:

```ts
{ type: 'relay.event', subId: string, result: RelayEventResult }
{ type: 'relay.eose', subId: string }
{ type: 'relay.publish.result', id: string, ok: boolean, event?: NostrEvent, error?: string }
{ type: 'relay.publishEncrypted.result', id: string, ok: boolean, event?: NostrEvent, error?: string }
{ type: 'relay.query.result', id: string, events: RelayEventResult[], error?: string }

{ type: 'identity.getPublicKey.result', id: string, pubkey: string }
{ type: 'identity.getRelays.result', id: string, relays: Record<string, { read: boolean, write: boolean }>, error?: string }
{ type: 'identity.getProfile.result', id: string, profile: object | null, error?: string }
{ type: 'identity.getFollows.result', id: string, pubkeys: string[], error?: string }
{ type: 'identity.getList.result', id: string, entries: string[], error?: string }
{ type: 'identity.getZaps.result', id: string, zaps: object[], error?: string }
{ type: 'identity.getMutes.result', id: string, pubkeys: string[], error?: string }
{ type: 'identity.getBlocked.result', id: string, pubkeys: string[], error?: string }
{ type: 'identity.getBadges.result', id: string, badges: object[], error?: string }

{ type: 'inc.event', topic: string, payload?: unknown, sender: string }

{ type: 'storage.get.result', id: string, value?: string | null, error?: string }
{ type: 'storage.set.result', id: string, error?: string }
{ type: 'storage.remove.result', id: string, error?: string }
{ type: 'storage.keys.result', id: string, keys?: string[], error?: string }

{ type: 'keys.registerAction.result', id: string, actionId: string, binding?: string, error?: string }
{ type: 'keys.bindings', bindings: Array<{ actionId: string, key: string }> }
{ type: 'keys.action', actionId: string }

{ type: 'media.session.create.result', id: string, sessionId?: string, owner?: 'shell' | 'napplet', error?: string }
{ type: 'media.state', sessionId: string, status: string, position?: number, duration?: number, volume?: number }
{ type: 'media.capabilities', sessionId: string, actions: string[] }
{ type: 'media.command', sessionId: string, action: string, value?: number }
{ type: 'media.controls', sessionId: string, controls: string[] }

{ type: 'notify.send.result', id: string, notificationId?: string, error?: string }
{ type: 'notify.permission.result', id: string, granted: boolean }
{ type: 'notify.action', notificationId: string, actionId: string }
{ type: 'notify.clicked', notificationId: string }
{ type: 'notify.dismissed', notificationId: string, reason?: string }
{ type: 'notify.controls', controls: string[] }

{ type: 'config.registerSchema.result', id: string, ok: boolean, code?: string, error?: string }
{ type: 'config.values', id?: string, values: object }
{ type: 'config.schemaError', code: string, error: string }

{ type: 'resource.bytes.result', id: string, blob: Blob, mime: string }
{ type: 'resource.bytes.error', id: string, error: 'invalid-request' | 'not-found' | 'blocked-by-policy' | 'timeout' | 'too-large' | 'unsupported-scheme' | 'decode-failed' | 'network-error' | 'quota-exceeded', message?: string }
{ type: 'resource.bytesMany.result', id: string, items: ResourceBytesItem[] }
{ type: 'resource.bytesMany.error', id: string, error: 'invalid-request' | 'not-found' | 'blocked-by-policy' | 'timeout' | 'too-large' | 'unsupported-scheme' | 'decode-failed' | 'network-error' | 'quota-exceeded', message?: string }

{ type: 'link.open.result', id: string, status: 'opened' | 'denied', error?: string }
{ type: 'lists.supported.result', id: string, lists?: object[], error?: string }
{ type: 'lists.add.result', id: string, ok: boolean, eventId?: string, added?: number, skipped?: number, error?: string, reason?: string, supported?: object[] }
{ type: 'lists.remove.result', id: string, ok: boolean, eventId?: string, removed?: number, skipped?: number, error?: string, reason?: string, supported?: object[] }
```

All request/response pairs are correlated by the `id` field. Identity request timeouts after 30 seconds.

## `window.napplet` Shape

After runtime injection, the global `window.napplet` object has the following structure:

```ts
window.napplet = {
  relay: {
    subscribe(filters, onEvent, onEose, options?): Subscription;
    publish(template, options?): Promise<NostrEvent>;
    publishEncrypted(template, recipient, encryption?): Promise<NostrEvent>;
    query(filters): Promise<RelayEventResult[]>;
  },
  inc: {
    emit(topic, payload?): void;
    on(topic, callback): { close(): void };
  },
  storage: {
    getItem(key): Promise<string | null>;
    setItem(key, value): Promise<void>;
    removeItem(key): Promise<void>;
    keys(): Promise<string[]>;
    instance: {
      getItem(key): Promise<string | null>;
      setItem(key, value): Promise<void>;
      removeItem(key): Promise<void>;
      keys(): Promise<string[]>;
    };
  },
  keys: {
    registerAction(action): Promise<{ actionId: string; binding?: string }>;
    unregisterAction(actionId): void;
    onAction(actionId, callback): { close(): void };
  },
  media: {
    createSession(options): Promise<{ sessionId?: string; owner?: 'shell' | 'napplet'; error?: string }>;
    updateSession(sessionId, metadata): void;
    destroySession(sessionId): void;
    reportState(sessionId, state): void;
    reportCapabilities(sessionId, actions): void;
    sendCommand(sessionId, action, value?): void;
    onCommand(sessionId, callback): { close(): void };
    onState(sessionId, callback): { close(): void };
    onCapabilities(sessionId, callback): { close(): void };
    onControls(sessionId, callback): { close(): void };
  },
  notify: {
    send(notification): Promise<{ notificationId: string }>;
    dismiss(notificationId): void;
    badge(count): void;
    registerChannel(channel): void;
    requestPermission(channel?): Promise<{ granted: boolean }>;
    onAction(callback): { close(): void };
    onClicked(callback): { close(): void };
    onDismissed(callback): { close(): void };
    onControls(callback): { close(): void };
  },
  identity: {
    getPublicKey(): Promise<string>;
    onChanged(handler): { close(): void };
    getRelays(): Promise<Record<string, { read: boolean; write: boolean }>>;
    getProfile(): Promise<object | null>;
    getFollows(): Promise<string[]>;
    getList(listType): Promise<string[]>;
    getZaps(): Promise<object[]>;
    getMutes(): Promise<string[]>;
    getBlocked(): Promise<string[]>;
    getBadges(): Promise<object[]>;
  },
  config: {
    registerSchema(schema, version?): Promise<void>;
    get(): Promise<Record<string, unknown>>;
    subscribe(callback): { close(): void };
    openSettings(options?): void;
    onSchemaError(callback): () => void;
    readonly schema: Record<string, unknown> | null;
  },
  resource: {
    bytes(url, opts?): Promise<Blob>;
    bytesMany(urls, opts?): Promise<ResourceBytesItem[]>;
    bytesAsObjectURL(url): { url: string; revoke: () => void };
  },
  link: {
    open(url, options?): Promise<{ status: 'opened' | 'denied' }>;
  },
  lists: {
    supported(): Promise<ListSupport[]>;
    add(list, items, options?): Promise<ListMutationResult>;
    remove(list, items, options?): Promise<ListMutationResult>;
  },
};
```

No generic `shell` object is installed. Runtime capability is represented by
which NAP domain properties the host injects.

### `window.napplet.relay`

Relay operations through the shell's relay pool via JSON envelope (relay.subscribe, relay.publish, relay.query messages).

| Method | Returns | Description |
|--------|---------|-------------|
| `subscribe(filters, onEvent, onEose, options?)` | `Subscription` | Open a relay subscription via JSON envelope. `onEvent` receives `RelayEventResult`. `options.relay` and `options.group` target scoped relays. |
| `publish(template, options?)` | `Promise<NostrEvent>` | Send an event template to the shell for signing and broadcast. |
| `publishEncrypted(template, recipient, encryption?)` | `Promise<NostrEvent>` | Send an event template to the shell for encryption, signing, and broadcast. NIP-44 default. |
| `query(filters)` | `Promise<RelayEventResult[]>` | One-shot query: sends a relay.query envelope, resolves when result records arrive. |

### `window.napplet.inc`

Inter-napplet communication between napplets via the shell. Topics are opaque
strings, so delivery uses the complete value supplied by the sender and
subscriber. A topic such as `napplet:profile/open` names a local convention; the
shim does not define its payload schema or add wildcard, prefix, or
canonicalization behavior.

| Method | Returns | Description |
|--------|---------|-------------|
| `emit(topic, payload?)` | `void` | Send an `inc.emit` JSON envelope to the shell for delivery to subscribers using the same topic string. |
| `on(topic, callback)` | `{ close(): void }` | Subscribe to `inc.event` JSON envelopes on a topic. Callback receives `(payload, event)`. |

This non-normative shim reference follows [NAP-INC draft PR #89 at its exact
head](https://github.com/napplet/naps/blob/34ec29fc4039384a83dbd6b476f83c4fa0d038e6/naps/NAP-INC.md).
The injected runtime preprocesses a queried convention URI only when it is sent
through `emit`:

```ts
window.napplet.inc.emit('napplet:profile/open?pubkey=abc123');
// -> { type: 'inc.emit', topic: 'napplet:profile/open', payload: { pubkey: 'abc123' } }

window.napplet.inc.on('napplet:profile/open', (payload) => {
  console.log(payload);
});
```

Query values are shallow percent-decoded text (`+` remains a literal plus) before
exact routing. Fragments, malformed percent encoding, repeated decoded names,
and a query combined with an explicit payload throw before postMessage. Use a
queryless topic plus the explicit payload argument for structured or non-text
data. NAP-INTENT and manifest conventions remain opaque; subscriptions and shell
routing never parse query text or add wildcard, prefix, or normalization matching.

### `window.napplet.storage`

Sandboxed key-value storage proxied through the shell. Scoped by napplet identity -- napplets cannot read each other's data. 512 KB quota per napplet.

| Method | Returns | Description |
|--------|---------|-------------|
| `getItem(key)` | `Promise<string \| null>` | Retrieve a stored value. Returns `null` if key does not exist. |
| `setItem(key, value)` | `Promise<void>` | Store a key-value pair. Throws on quota exceeded. |
| `removeItem(key)` | `Promise<void>` | Remove a stored key. |
| `keys()` | `Promise<string[]>` | List all keys stored by this napplet. |
| `instance.getItem/setItem/removeItem/keys` | (same as above) | Per-instance storage scope — same surface, scoped to this napplet instance (sets `scope: "instance"` on the wire). See NAP-STORAGE. |

### `window.napplet.keys`

Keyboard forwarding and action keybindings. The shim installs a capture-phase keydown listener that implements smart forwarding: unbound keys are forwarded to the shell via `keys.forward`, while bound keys are handled locally with zero latency.

| Method | Returns | Description |
|--------|---------|-------------|
| `registerAction(action)` | `Promise<{ actionId, binding? }>` | Declare a named action the shell can bind to a key. `defaultKey` is a hint. |
| `unregisterAction(actionId)` | `void` | Remove a previously registered action. Fire-and-forget. |
| `onAction(actionId, callback)` | `{ close(): void }` | Register a local handler for a bound key. NOT a wire message -- zero latency. |

Smart forwarding rules:
- Text inputs (`<input>`, `<textarea>`, `contenteditable`) are never forwarded (prevents credential leakage)
- Bare modifier keys are never forwarded
- IME composition events are never forwarded
- Reserved keys (`Tab`, `Shift+Tab`, `Escape`) are never suppressed
- Bound keys: `preventDefault()` + local action handler, no `keys.forward`
- Unbound keys: forwarded to shell via `keys.forward`

### `window.napplet.media`

Ownership-aware media session control. Napplet-owned sessions report playback state and receive shell commands; shell-owned sessions provide a source and receive shell-reported state/capabilities.

| Method | Returns | Description |
|--------|---------|-------------|
| `createSession(options)` | `Promise<{ sessionId?, owner?, error? }>` | Create a napplet- or shell-owned media session. |
| `updateSession(sessionId, metadata)` | `void` | Update metadata for an existing session. Fire-and-forget. |
| `destroySession(sessionId)` | `void` | Destroy a session. Fire-and-forget. |
| `reportState(sessionId, state)` | `void` | Report playback state (status, position, duration, volume). |
| `reportCapabilities(sessionId, actions)` | `void` | Declare supported media actions (dynamic). |
| `sendCommand(sessionId, action, value?)` | `void` | Request a control action from the current playback owner. |
| `onCommand(sessionId, callback)` | `{ close(): void }` | Listen for shell media commands (play, pause, seek, volume, etc.). |
| `onState(sessionId, callback)` | `{ close(): void }` | Listen for shell-reported state on shell-owned sessions. |
| `onCapabilities(sessionId, callback)` | `{ close(): void }` | Listen for shell-reported capabilities on shell-owned sessions. |
| `onControls(sessionId, callback)` | `{ close(): void }` | Listen for the shell's session-scoped supported control list. |

### `window.napplet.notify`

Shell-rendered notifications. Send notifications, set badge counts, register channels, request permission, and listen for user interaction.

| Method | Returns | Description |
|--------|---------|-------------|
| `send(notification)` | `Promise<{ notificationId }>` | Send a notification to the shell. |
| `dismiss(notificationId)` | `void` | Dismiss a notification. Fire-and-forget. |
| `badge(count)` | `void` | Set badge count (0 to clear). Fire-and-forget. |
| `registerChannel(channel)` | `void` | Register a notification channel. Fire-and-forget. |
| `requestPermission(channel?)` | `Promise<{ granted }>` | Request permission to send notifications. |
| `onAction(callback)` | `{ close(): void }` | Listen for action button clicks. |
| `onClicked(callback)` | `{ close(): void }` | Listen for notification body clicks. |
| `onDismissed(callback)` | `{ close(): void }` | Listen for dismissals (user/timeout/replaced). |
| `onControls(callback)` | `{ close(): void }` | Listen for shell's notification capabilities. |

### `window.napplet.config`

Per-napplet declarative configuration (NAP-CONFIG). The shell is the sole writer; napplets subscribe to live values, request snapshots, register runtime schemas, and deep-link the shell's settings UI.

| Method | Returns | Description |
|--------|---------|-------------|
| `registerSchema(schema, version?)` | `Promise<void>` | Register a schema at runtime (escape hatch -- prefer manifest-driven via @napplet/vite-plugin). |
| `get()` | `Promise<Record<string, unknown>>` | One-shot snapshot of validated + defaulted values. |
| `subscribe(callback)` | `{ close(): void }` | Live push stream; wire-level subscribe emitted on 0->1 local-subscriber transition. |
| `openSettings(options?)` | `void` | Ask the shell to open its settings UI, optionally deep-linked to an `x-napplet-section` name. |
| `onSchemaError(callback)` | `() => void` | Listen for uncorrelated `config.schemaError` pushes (returns a plain teardown fn). |
| `schema` (accessor) | `Record<string, unknown> \| null` | Readonly current schema snapshot (manifest-declared or last-accepted runtime registration). |

### `window.napplet.resource`

Sandboxed byte fetching. The iframe sandbox (no `allow-same-origin`) plus strict CSP (no `connect-src`) means napplets cannot fetch external URLs directly — `<img src="https://...">`, `fetch()`, and `XMLHttpRequest` are all blocked by the browser. Use `resource.bytes(url)` or `resource.bytesMany(urls)` to fetch external resources through the shell.

| Method | Returns | Description |
|--------|---------|-------------|
| `bytes(url, opts?)` | `Promise<Blob>` | Fetch bytes for a URL via the shell. `opts.signal` accepts an `AbortSignal` for cancellation. |
| `bytesMany(urls, opts?)` | `Promise<ResourceBytesItem[]>` | Fetch many URLs through one envelope. Items preserve input order and length. |
| `bytesAsObjectURL(url)` | `{ url: string; revoke: () => void }` | Synchronous handle whose `url` resolves to a blob URL once the underlying fetch completes. Caller MUST `revoke()` when done. |

Canonical schemes: `data:` (decoded in-shim), `https:` (shell-side network with policy), `blossom:sha256:<hex>` (hash-verified), `htree:` (Hashtree-verified), `nostr:<bech32>` (single-hop NIP-19 resolution).

Errors reject the Promise with one of 8 codes: `not-found`, `blocked-by-policy`, `timeout`, `too-large`, `unsupported-scheme`, `decode-failed`, `network-error`, `quota-exceeded`.

Capability detection:

```ts
if (window.napplet?.resource) { /* shell offers the resource NAP */ }
```

### Runtime-injected domains

Domain properties are the availability signal:

```ts
if (window.napplet?.relay) { /* relay API available */ }
if (window.napplet?.resource) { /* resource API available */ }
if (!window.napplet?.media) { /* render fallback */ }
```

## TypeScript Support

The runtime installs `window.napplet` before napplet code runs. The package does
not modify global `Window` types in its published source so it can be accepted by
JSR. For direct `window.napplet` access, use `NappletGlobal` from
`@napplet/core` in a local cast or ambient declaration:

```ts
import type { NappletGlobal } from '@napplet/core';

const napplet = (window as Window & { napplet: NappletGlobal }).napplet;

napplet.relay.subscribe({ kinds: [1] }, (event) => {
  // event is typed as NostrEvent
});

if (napplet.identity) {
  await napplet.identity.getPublicKey();
}
```

For named typed helpers, prefer `@napplet/sdk`; it wraps `window.napplet` without
requiring global type augmentation.

For napplet-side named imports, use `@napplet/sdk`.

## Shim vs SDK

| | `@napplet/shim` | `@napplet/sdk` |
|---|---|---|
| **Import style** | `import { installNappletGlobal } from '@napplet/shim'` or `@napplet/shim/prelude` | `import { relay, inc } from '@napplet/sdk'` |
| **What it does** | Runtime-side injected global installer plus host prelude artifact | Named exports wrapping `window.napplet` |
| **Dependencies** | `@napplet/nap` (uses `@napplet/nap/<domain>/shim` subpaths internally) | `@napplet/core` (types only) |
| **When to use** | In the host runtime before napplet scripts execute | In napplet code when you want typed imports in a bundler |
| **Named exports** | `installNappletGlobal` | `relay`, `inc`, `storage`, `keys`, `identity`, plus types |

Runtime usage:

```ts
import { installNappletGlobal } from '@napplet/shim';

installNappletGlobal({ domains: ['relay', 'inc', 'storage', 'identity'] });
```

Host prelude usage:

```ts
import { renderNappletRuntimePreludeCall } from '@napplet/shim/prelude';

renderNappletRuntimePreludeCall({ domains: ['relay', 'identity'] });
```

Napplet usage:

```ts
import { relay, inc, storage, keys, identity } from '@napplet/sdk';
```

## Protocol Reference

- [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) -- Napplet-shell protocol specification

## License

MIT
