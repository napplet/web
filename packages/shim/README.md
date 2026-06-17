# @napplet/shim

> Side-effect-only window installer for napplet iframes. Importing `@napplet/shim` installs the `window.napplet` global. No named exports. No cryptographic dependencies -- the shim sends JSON envelope messages and the shell handles identity.

## Getting Started

### Prerequisites

- A shell host running a napplet protocol shell implementation

### How It Works

1. Import `@napplet/shim` in your napplet's entry point (side-effect only -- no named exports)
2. The shim registers with the shell via postMessage -- the shell assigns identity based on the iframe's `message.source` Window reference
3. Once registered, `window.napplet` is populated with relay, inc, storage, keys, media, notify, identity, config, resource, cvm, outbox, upload, intent, and shell sub-objects
4. No `window.nostr` is installed -- signing and encryption are mediated by the shell via `relay.publish()` and `relay.publishEncrypted()`

### Installation

```bash
npm install @napplet/shim
```

## Quick Start

```ts
// Side-effect import -- installs window.napplet (no window.nostr)
import '@napplet/shim';

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

// Listen for inter-napplet events from other napplets
const incSub = window.napplet.inc.on('profile:open', (payload) => {
  console.log('Profile requested:', payload);
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
const handle = window.napplet.resource.bytesAsObjectURL('blossom:sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
imgEl.src = handle.url;
// later: handle.revoke();

// Clean up
sub.close();
incSub.close();
identitySub.close();
keySub.close();
mediaSub.close();
notifySub.close();
configSub.close();
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
{ type: 'resource.cancel', id: string }
```

### Inbound (shell → napplet)

Messages received via `window.addEventListener('message', ...)`:

```ts
{ type: 'relay.event', subId: string, event: NostrEvent }
{ type: 'relay.eose', subId: string }
{ type: 'relay.publish.result', id: string, ok: boolean, event?: NostrEvent, error?: string }
{ type: 'relay.publishEncrypted.result', id: string, ok: boolean, event?: NostrEvent, error?: string }
{ type: 'relay.query.result', id: string, events: NostrEvent[], error?: string }

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
{ type: 'resource.bytes.error', id: string, error: 'not-found' | 'blocked-by-policy' | 'timeout' | 'too-large' | 'unsupported-scheme' | 'decode-failed' | 'network-error' | 'quota-exceeded', message?: string }
```

All request/response pairs are correlated by the `id` field. Identity request timeouts after 30 seconds.

## `window.napplet` Shape

After `import '@napplet/shim'`, the global `window.napplet` object has the following structure:

```ts
window.napplet = {
  relay: {
    subscribe(filters, onEvent, onEose, options?): Subscription;
    publish(template, options?): Promise<NostrEvent>;
    publishEncrypted(template, recipient, encryption?): Promise<NostrEvent>;
    query(filters): Promise<NostrEvent[]>;
  },
  inc: {
    emit(topic, extraTags?, content?): void;
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
    bytesAsObjectURL(url): { url: string; revoke: () => void };
  },
  shell: {
    supports(capability: NamespacedCapability, protocol?: ProtocolId): boolean;
  },
};
```

### `window.napplet.relay`

Relay operations through the shell's relay pool via JSON envelope (relay.subscribe, relay.publish, relay.query messages).

| Method | Returns | Description |
|--------|---------|-------------|
| `subscribe(filters, onEvent, onEose, options?)` | `Subscription` | Open a relay subscription via JSON envelope. `options.relay` and `options.group` for NIP-29 scoped relays. |
| `publish(template, options?)` | `Promise<NostrEvent>` | Send an event template to the shell for signing and broadcast. |
| `publishEncrypted(template, recipient, encryption?)` | `Promise<NostrEvent>` | Send an event template to the shell for encryption, signing, and broadcast. NIP-44 default. |
| `query(filters)` | `Promise<NostrEvent[]>` | One-shot query: sends a relay.query envelope, resolves when results arrive. |

### `window.napplet.inc`

Inter-napplet communication between napplets via the shell.

| Method | Returns | Description |
|--------|---------|-------------|
| `emit(topic, extraTags?, content?)` | `void` | Send an `inc.emit` JSON envelope to the shell for delivery to matching topic subscribers. |
| `on(topic, callback)` | `{ close(): void }` | Subscribe to `inc.event` JSON envelopes on a topic. Callback receives `(payload, event)`. |

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

Sandboxed byte fetching. The iframe sandbox (no `allow-same-origin`) plus strict CSP (no `connect-src`) means napplets cannot fetch external URLs directly — `<img src="https://...">`, `fetch()`, and `XMLHttpRequest` are all blocked by the browser. Use `resource.bytes(url)` to fetch any external resource through the shell.

| Method | Returns | Description |
|--------|---------|-------------|
| `bytes(url, opts?)` | `Promise<Blob>` | Fetch bytes for a URL via the shell. `opts.signal` accepts an `AbortSignal` for cancellation. |
| `bytesAsObjectURL(url)` | `{ url: string; revoke: () => void }` | Synchronous handle whose `url` resolves to a blob URL once the underlying fetch completes. Caller MUST `revoke()` when done. |

Four canonical schemes: `data:` (decoded in-shim), `https:` (shell-side network with policy), `blossom:sha256:<hex>` (hash-verified), `nostr:<bech32>` (single-hop NIP-19 resolution).

Errors reject the Promise with one of 8 codes: `not-found`, `blocked-by-policy`, `timeout`, `too-large`, `unsupported-scheme`, `decode-failed`, `network-error`, `quota-exceeded`.

Capability detection:

```ts
if (window.napplet.shell.supports('resource')) { /* shell offers the resource NAP */ }
```

### `window.napplet.shell` — NAP-SHELL

`shell` is the **foundational, mandatory** NAP domain — the one capability that
is *not* discoverable via `supports()` and is always present. It is the bootstrap
handshake:

1. On import, the shim posts `shell.ready` (no payload) — a bare "my receiver is
   live" liveness signal.
2. The runtime replies **once** with `shell.init`, carrying the environment
   `{ capabilities: { domains, protocols }, services }`.
3. The shim caches that environment, so `supports(domain, protocol?)` is answered
   **synchronously and locally** thereafter — no wire round-trip per query.

```ts
// Synchronous, local capability queries:
window.napplet.shell.supports('relay');        // true if the runtime offers relay
window.napplet.shell.supports('inc', 'NAP-2'); // true if it also speaks NAP-2
window.napplet.shell.supports('unknown');      // false — domain not offered

// Named services the runtime exposes for this napplet:
window.napplet.shell.services;                 // string[]  (e.g. ['signer'])

// Gate startup on environment delivery:
const env = await window.napplet.shell.ready();
const sub = window.napplet.shell.onReady((e) => start(e));
```

Before `shell.init` arrives, `supports()` returns `false` for everything,
`services` is `[]`, and `ready()` is pending. A duplicate
`shell.init` is ignored (first init wins). Use `supports()` as a feature gate
before calling APIs that depend on a specific domain or numbered protocol.

The `@napplet/nap/shell` subpath provides the NAP-SHELL types and SDK helpers
(`shellSupports`, `shellServices`, `shellReady`, `shellOnReady`)
alongside the other domain subpaths.

## TypeScript Support

Importing `@napplet/shim` installs `window.napplet` at runtime. The package does
not modify global `Window` types in its published source so it can be accepted by
JSR. For direct `window.napplet` access, use `NappletGlobal` from
`@napplet/core` in a local cast or ambient declaration:

```ts
import type { NappletGlobal } from '@napplet/core';
import '@napplet/shim';

const napplet = (window as Window & { napplet: NappletGlobal }).napplet;

napplet.relay.subscribe({ kinds: [1] }, (event) => {
  // event is typed as NostrEvent
});

napplet.shell.supports('identity'); // typed as (capability: string) => boolean
```

For named typed helpers, prefer `@napplet/sdk`; it wraps `window.napplet` without
requiring global type augmentation.

**Note:** `@napplet/shim` has zero named exports -- `import { anything } from '@napplet/shim'` is a TypeScript error. For named imports, use `@napplet/sdk`.

## Shim vs SDK

| | `@napplet/shim` | `@napplet/sdk` |
|---|---|---|
| **Import style** | `import '@napplet/shim'` (side-effect) | `import { relay, inc } from '@napplet/sdk'` |
| **What it does** | Installs `window.napplet` global + shell registration | Named exports wrapping `window.napplet` |
| **Dependencies** | `@napplet/nap` (uses `@napplet/nap/<domain>/shim` subpaths internally) | `@napplet/core` (types only) |
| **When to use** | Always -- required to install the runtime | When you want typed imports in a bundler |
| **Named exports** | None | `relay`, `inc`, `storage`, `keys`, `identity`, plus types |

**Typical usage:** Import both -- shim for window installation, SDK for typed API access:

```ts
import '@napplet/shim';
import { relay, inc, storage, keys, identity } from '@napplet/sdk';
```

## Protocol Reference

- [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) -- Napplet-shell protocol specification

## License

MIT
