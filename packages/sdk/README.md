# @napplet/sdk

> Named TypeScript exports for napplet developers using a bundler. Wraps `window.napplet` at call time.

## Getting Started

### Prerequisites

- `@napplet/shim` must be imported (side-effect) to install `window.napplet` before SDK methods are called
- A shell host running a napplet protocol shell implementation

### How It Works

1. Import `@napplet/shim` in your entry point to install the `window.napplet` global
2. Import named exports from `@napplet/sdk` -- `relay`, `ifc`, `storage`, `keys`
3. Each SDK method delegates to its `window.napplet.*` counterpart at call time
4. If `window.napplet` is not installed when a method is called, a descriptive error is thrown

### Installation

```bash
npm install @napplet/sdk @napplet/shim
```

## Quick Start

```ts
import '@napplet/shim';
import { relay, ifc, storage, keys, media, notify, config, resource, type NappletConnect, type NostrEvent } from '@napplet/sdk';

// Subscribe to kind 1 notes
const sub = relay.subscribe(
  { kinds: [1], limit: 20 },
  (event) => console.log('New note:', event.content),
  () => console.log('End of stored events'),
);

// Publish a signed note
const signed = await relay.publish({
  kind: 1,
  content: 'Hello from my napplet!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000),
});

// Inter-frame messaging
ifc.emit('chat:message', [], JSON.stringify({ text: 'hi' }));
const ifcSub = ifc.on('bot:response', (payload) => {
  console.log('Bot says:', payload);
});

// Scoped storage
await storage.setItem('theme', 'dark');
const theme = await storage.getItem('theme'); // 'dark'

// Register keyboard action
const result = await keys.registerAction({
  id: 'editor.save', label: 'Save', defaultKey: 'Ctrl+S',
});

// Listen for bound key locally
const keySub = keys.onAction('editor.save', () => {
  console.log('Save triggered!');
});

// Create a media session
const { sessionId } = await media.createSession({
  title: 'My Song', artist: 'The Artist',
});
media.reportState(sessionId, { status: 'playing', position: 42.5, duration: 240 });

// Send a notification
const { notificationId } = await notify.send({
  title: 'Task complete', body: 'Build succeeded', priority: 'normal',
});
notify.badge(1);

// Read per-napplet config (shell-validated + defaulted)
const values = await config.get();
console.log('Current theme:', values.theme);

// Subscribe to live config updates
const configSub = config.subscribe((v) => {
  applyTheme(v.theme);
});

// Deep-link settings UI
config.openSettings({ section: 'appearance' });

// Fetch external bytes via the shell (the iframe sandbox + strict CSP block direct fetch)
const avatarBlob = await resource.bytes('https://example.com/avatar.png');
const handle = resource.bytesAsObjectURL('blossom:sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
imgEl.src = handle.url;
// handle.revoke() when done

// Check shell-assigned class (v0.29.0, NAP-CLASS)
import { getClass, CLASS_DOMAIN } from '@napplet/sdk';
if (window.napplet.shell.supports(`nap:${CLASS_DOMAIN}`)) {
  const cls = getClass();   // number | undefined
  if (cls === 2) { /* NAP-CLASS-2 posture */ }
}

// Use direct network access if the user approved `connect` origins (v0.29.0, NAP-CONNECT)
import { connectGranted, connectOrigins } from '@napplet/sdk';
if (connectGranted()) {
  const res = await fetch(`${connectOrigins()[0]}/items`);
}

// Clean up
sub.close();
ifcSub.close();
keySub.close();
configSub.close();
```

## API Reference

### `relay`

Relay operations through the shell's relay pool. Mirrors `window.napplet.relay`.

| Method | Returns | Description |
|--------|---------|-------------|
| `subscribe(filters, onEvent, onEose, options?)` | `Subscription` | Open a live relay subscription through the shell's relay pool |
| `publish(template, options?)` | `Promise<NostrEvent>` | Send event template to the shell for signing and broadcast |
| `publishEncrypted(template, recipient, encryption?)` | `Promise<NostrEvent>` | Send event template for encryption, signing, and broadcast |
| `query(filters)` | `Promise<NostrEvent[]>` | One-shot query: subscribe, collect until EOSE, resolve |

### `ifc`

Inter-frame communication between napplets. Mirrors `window.napplet.ifc`.

Messages are sent as JSON envelope objects (`{ type: 'ifc.emit', topic, payload }`) and received as
(`{ type: 'ifc.event', topic, payload, sender }`).

| Method | Returns | Description |
|--------|---------|-------------|
| `emit(topic, extraTags?, content?)` | `void` | Broadcast an IFC event to other napplets via the shell |
| `on(topic, callback)` | `{ close(): void }` | Subscribe to IFC events on a topic |

### `storage`

Sandboxed key-value storage. Mirrors `window.napplet.storage`. 512 KB quota per napplet.

| Method | Returns | Description |
|--------|---------|-------------|
| `getItem(key)` | `Promise<string \| null>` | Retrieve a stored value |
| `setItem(key, value)` | `Promise<void>` | Store a key-value pair |
| `removeItem(key)` | `Promise<void>` | Remove a stored key |
| `keys()` | `Promise<string[]>` | List all stored keys |

### `media`

Media session control. Mirrors `window.napplet.media`.

| Method | Returns | Description |
|--------|---------|-------------|
| `createSession(metadata?)` | `Promise<{ sessionId }>` | Create a new media session with optional metadata |
| `updateSession(sessionId, metadata)` | `void` | Update metadata for an existing session |
| `destroySession(sessionId)` | `void` | Destroy a session |
| `reportState(sessionId, state)` | `void` | Report playback state |
| `reportCapabilities(sessionId, actions)` | `void` | Declare supported media actions |
| `onCommand(sessionId, callback)` | `{ close(): void }` | Listen for shell media commands |
| `onControls(sessionId, callback)` | `{ close(): void }` | Listen for the shell's supported control list |

### `notify`

Shell-rendered notifications. Mirrors `window.napplet.notify`.

| Method | Returns | Description |
|--------|---------|-------------|
| `send(notification)` | `Promise<{ notificationId }>` | Send a notification to the shell |
| `dismiss(notificationId)` | `void` | Dismiss a notification |
| `badge(count)` | `void` | Set badge count (0 to clear) |
| `registerChannel(channel)` | `void` | Register a notification channel |
| `requestPermission(channel?)` | `Promise<{ granted }>` | Request permission to send notifications |
| `onAction(callback)` | `{ close(): void }` | Listen for action button clicks |
| `onClicked(callback)` | `{ close(): void }` | Listen for notification body clicks |
| `onDismissed(callback)` | `{ close(): void }` | Listen for dismissals |
| `onControls(callback)` | `{ close(): void }` | Listen for shell's notification capabilities |

### `config`

Per-napplet declarative configuration (NAP-CONFIG). Mirrors `window.napplet.config`.

| Method | Returns | Description |
|--------|---------|-------------|
| `get()` | `Promise<Record<string, unknown>>` | One-shot snapshot of validated + defaulted config values |
| `subscribe(callback)` | `{ close(): void }` | Live push stream (initial snapshot + updates on change) |
| `openSettings(options?)` | `void` | Open shell's settings UI, optionally deep-linked to `x-napplet-section` |
| `registerSchema(schema, version?)` | `Promise<void>` | Runtime schema registration (escape hatch; prefer vite-plugin configSchema) |
| `onSchemaError(callback)` | `() => void` | Listen for `config.schemaError` pushes (returns plain teardown fn) |
| `schema` (accessor) | `Record<string, unknown> \| null` | Readonly current schema |

### FromSchema type inference (NAP-CONFIG)

`json-schema-to-ts` is declared as an optional `peerDependency` of `@napplet/nub` (scoped to the `@napplet/nub/config` domain's `FromSchema` typing). Install it in your napplet to get `FromSchema<typeof schema>` typing for your `config.subscribe` callback -- the `values` parameter is inferred directly from your schema (enums, required fields, defaults all flow through). Authors who skip `json-schema-to-ts` pay no install cost and `config.subscribe` still works with the default `Record<string, unknown>` typing.

```ts
import '@napplet/shim';
import { config } from '@napplet/sdk';
import type { FromSchema } from 'json-schema-to-ts';

const schema = {
  type: 'object',
  properties: {
    theme: { type: 'string', enum: ['light', 'dark'], default: 'dark' },
  },
  required: ['theme'],
} as const;

type MyConfig = FromSchema<typeof schema>;

const sub = config.subscribe((values: MyConfig) => {
  // values.theme is typed 'light' | 'dark'
});
```

Install the peer when you want typed callbacks:

```bash
npm install --save-dev json-schema-to-ts
```

### `resource`

Sandboxed byte fetching (NAP-RESOURCE). Mirrors `window.napplet.resource`. Required because the iframe sandbox + strict CSP block direct `fetch()` / `<img src=externalUrl>` / `XMLHttpRequest`.

| Method | Returns | Description |
|--------|---------|-------------|
| `bytes(url, opts?)` | `Promise<Blob>` | Fetch bytes through the shell. `opts.signal` accepts an `AbortSignal`. |
| `bytesAsObjectURL(url)` | `{ url: string; revoke: () => void }` | Synchronous handle whose `url` resolves to a blob URL once the fetch completes. |

Four canonical schemes: `data:` (in-shim), `https:` (shell-side under policy), `blossom:sha256:<hex>` (hash-verified), `nostr:<bech32>` (single-hop NIP-19).

Bare helper aliases are also re-exported for consumers that prefer functional imports:

```ts
import { resourceBytes, resourceBytesAsObjectURL } from '@napplet/sdk';

const blob = await resourceBytes('https://example.com/avatar.png');
const handle = resourceBytesAsObjectURL('blossom:sha256:...');
```

### `connect` (v0.29.0)

User-gated direct network access (NAP-CONNECT). State-only — no method namespace, no wire messages. The SDK re-exports the `NappletConnect` type, the `CONNECT_DOMAIN` constant, the `installConnectShim` installer, and the `connectGranted` / `connectOrigins` / `normalizeConnectOrigin` helper functions.

```ts
import type { NappletConnect } from '@napplet/sdk';
import { CONNECT_DOMAIN, installConnectShim, connectGranted, connectOrigins, normalizeConnectOrigin } from '@napplet/sdk';

// Napplet-side runtime (window.napplet.connect is populated by the shim at install)
if (connectGranted()) {
  const origins: readonly string[] = connectOrigins();
  const res = await fetch(`${origins[0]}/items`);
}

// Build-side / shell-side shared origin validator
const normalized = normalizeConnectOrigin('https://api.example.com');   // returns input byte-identical on success; throws on invalid
```

| Export | Kind | Source | Description |
|--------|------|--------|-------------|
| `NappletConnect` | type | `@napplet/nub/connect` | `{ readonly granted: boolean; readonly origins: readonly string[] }` |
| `CONNECT_DOMAIN` | const | `@napplet/nub/connect` | The domain identifier string `'connect'` |
| `installConnectShim` | function | `@napplet/nub/connect` | Side-effect installer — reads the discovery meta tag and mounts `window.napplet.connect` |
| `connectGranted()` | function | `@napplet/nub/connect` | `() => boolean` — readonly helper; safer than direct `window.napplet.connect.granted` access |
| `connectOrigins()` | function | `@napplet/nub/connect` | `() => readonly string[]` — readonly helper |
| `normalizeConnectOrigin(origin)` | function | `@napplet/nub/connect` | Shared origin validator (used by vite-plugin AND shell implementations); throws on invalid input with `[@napplet/nub/connect]`-prefixed messages |

### `class` (v0.29.0)

Shell-assigned integer class (NAP-CLASS). Wire-only — the shell sends exactly one `class.assigned` envelope per napplet lifecycle; the shim writes the integer to `window.napplet.class`. The SDK re-exports the wire type, the domain constant, the installer, and a `getClass()` helper.

```ts
import type { ClassAssignedMessage, NappletClass, ClassNubMessage } from '@napplet/sdk';
import { CLASS_DOMAIN, installClassShim, getClass } from '@napplet/sdk';

if (window.napplet.shell.supports(`nap:${CLASS_DOMAIN}`)) {
  const cls = getClass();   // number | undefined
  // cls === 1 -> NAP-CLASS-1 (strict baseline)
  // cls === 2 -> NAP-CLASS-2 (user-approved explicit-origin)
  // cls === undefined -> shell doesn't implement nap:class OR envelope hasn't arrived yet
}
```

| Export | Kind | Source | Description |
|--------|------|--------|-------------|
| `ClassAssignedMessage` | type | `@napplet/nub/class` | `{ type: 'class.assigned'; id: string; class: number }` |
| `NappletClass` | type | `@napplet/nub/class` | `{ readonly class: number \| undefined }` |
| `ClassMessage` / `ClassNubMessage` | type | `@napplet/nub/class` | Discriminated union alias (class.assigned is the only member in v1) |
| `CLASS_DOMAIN` | const | `@napplet/nub/class` | The domain identifier string `'class'` |
| `installClassShim` | function | `@napplet/nub/class` | Side-effect installer — registers the `class.assigned` dispatcher handler and mounts `window.napplet.class` |
| `getClass()` | function | `@napplet/nub/class` | `() => number \| undefined` — readonly helper |

### `keys`

Keyboard forwarding and action keybindings. Mirrors `window.napplet.keys`.

| Method | Returns | Description |
|--------|---------|-------------|
| `registerAction(action)` | `Promise<{ actionId, binding? }>` | Declare a named action the shell can bind to a key |
| `unregisterAction(actionId)` | `void` | Remove a previously registered action |
| `onAction(actionId, callback)` | `{ close(): void }` | Register a local handler for a bound key (zero-latency, not a wire message) |

### `identity`

Read-only user identity queries (NAP-IDENTITY). The identity namespace
is NOT exported as a top-level SDK object — use `window.napplet.identity.*` directly
after importing `@napplet/shim`, or use the bare-name helpers below.

| Method | Returns | Description |
|--------|---------|-------------|
| `window.napplet.identity.getPublicKey()` | `Promise<string>` | Shell-user pubkey, or `""` when no user/signer is connected |
| `window.napplet.identity.onChanged(handler)` | `{ close(): void }` | Listen for shell-pushed identity changes; handler receives a pubkey or `""` |

Bare helper aliases are also re-exported for consumers that prefer functional imports:

```ts
import { identityGetPublicKey, identityOnChanged } from '@napplet/sdk';

const pubkey = await identityGetPublicKey();
const sub = identityOnChanged((nextPubkey) => {
  console.log(nextPubkey || 'signed out');
});
```

NAP-IDENTITY is strictly read-only. Signing remains delegated through
`relay.publish()`, encryption through `relay.publishEncrypted()`, and identity
changes arrive through `identity.changed` rather than polling.

### `shell`

Namespaced capability query. Access via `window.napplet.shell.supports()` after importing `@napplet/shim`.

> Note: The SDK does not export a top-level `shell` object. Use `window.napplet.shell.supports()` directly.

| Method | Returns | Description |
|--------|---------|-------------|
| `supports(capability, protocol?)` | `boolean` | Check shell support for a NAP (`nap:relay`), permission (`perm:popups`), or numbered NAP-NN protocol over an interface (`ifc`, `NAP-01`). Bare NAP names also accepted (`relay`); `nub:`/`NUB-*` remain deprecated aliases. |

**Example:**

```ts
import '@napplet/shim';

// NAP domains (bare shorthand or nap: prefix)
if (window.napplet.shell.supports('relay')) { /* ... */ }
if (window.napplet.shell.supports('nap:identity')) { /* ... */ }

// Permissions
if (window.napplet.shell.supports('perm:popups')) { /* ... */ }

// Numbered NAP-NN message protocols
if (window.napplet.shell.supports('ifc', 'NAP-01')) { /* ... */ }
```

### Namespace Import

`import * as napplet from '@napplet/sdk'` produces an object structurally identical to `window.napplet`:

```ts
import * as napplet from '@napplet/sdk';

napplet.relay.subscribe({ kinds: [1] }, (e) => console.log(e));
napplet.storage.setItem('key', 'value');
napplet.config.subscribe((v) => console.log(v));
```

## Types

All protocol types are re-exported from `@napplet/core` and the NUB packages:

```ts
import type {
  // Protocol types (from @napplet/core)
  NostrEvent,
  NostrFilter,
  Subscription,
  EventTemplate,
  NappletMessage,
  NapDomain,
  NubDomain,
  NamespacedCapability,
  NapProtocolId,
  NubProtocolId,
  ShellSupports,
  // NUB message types (re-exported from NUB packages)
  RelayNubMessage,
  IdentityNubMessage,
  StorageNubMessage,
  IfcNubMessage,
  KeysNubMessage,
  Action,
} from '@napplet/sdk';
```

### Core Protocol Types

| Type | Description |
|------|-------------|
| `NostrEvent` | Standard Nostr event object |
| `NostrFilter` | Relay subscription filter |
| `Subscription` | Handle with `close()` method |
| `EventTemplate` | Unsigned event for `relay.publish()` |
| `NappletMessage` | Base JSON envelope type for all protocol messages |
| `NapDomain` | String literal union of NAP domain names |
| `NamespacedCapability` | Union of `NapDomain \| nap:* \| nub:* \| perm:*` for `supports()` |
| `NapProtocolId` | Numbered NAP protocol id such as `NAP-01` for the optional second `supports()` argument |
| `NubDomain` / `NubProtocolId` | Deprecated aliases retained during the NAP rename |
| `ShellSupports` | Interface for the shell capability query API |

### NUB Message Types

These are discriminated union types covering all messages in each NAP domain. Useful for writing typed message
handlers in shell implementations or protocol-aware code.

| Type | NUB Package | Description |
|------|-------------|-------------|
| `RelayNubMessage` | `@napplet/nub/relay` | Discriminated union of all relay domain messages |
| `IdentityNubMessage` | `@napplet/nub/identity` | Discriminated union of all identity domain messages |
| `StorageNubMessage` | `@napplet/nub/storage` | Discriminated union of all storage domain messages |
| `IfcNubMessage` | `@napplet/nub/ifc` | Discriminated union of all IFC domain messages |
| `KeysNubMessage` | `@napplet/nub/keys` | Discriminated union of all keys domain messages |
| `MediaNubMessage` | `@napplet/nub/media` | Discriminated union of all media domain messages |
| `NotifyNubMessage` | `@napplet/nub/notify` | Discriminated union of all notify domain messages |
| `ConfigNubMessage` | `@napplet/nub/config` | Discriminated union of all config domain messages |
| `ResourceNubMessage` | `@napplet/nub/resource` | Discriminated union of all resource domain messages |
| `ConnectNubMessage` * | `@napplet/nub/connect` | State-only NUB — no wire messages. The `NappletConnect` runtime state type is the consumer-facing import. |
| `ClassNubMessage`   | `@napplet/nub/class`   | Discriminated union of all class domain messages (v1: only `ClassAssignedMessage`) |

\* There is no `ConnectNubMessage` type; NAP-CONNECT has no postMessage wire. The consumer-facing import is the `NappletConnect` runtime state interface.

Individual message types (e.g., `RelaySubscribeMessage`, `IdentityGetPublicKeyMessage`) are also re-exported from
`@napplet/sdk` for fine-grained typing.

## NUB Domain Constants

Each NAP domain has a string constant re-exported from its package:

```ts
import { RELAY_DOMAIN, IDENTITY_DOMAIN, STORAGE_DOMAIN, IFC_DOMAIN, THEME_DOMAIN, KEYS_DOMAIN, MEDIA_DOMAIN, NOTIFY_DOMAIN, CONFIG_DOMAIN, RESOURCE_DOMAIN, CONNECT_DOMAIN, CLASS_DOMAIN } from '@napplet/sdk';
// Values: 'relay', 'identity', 'storage', 'ifc', 'theme', 'keys', 'media', 'notify', 'config', 'resource', 'connect', 'class'
```

These constants are re-exported from the individual domain packages. Use them with the shell capability query
API for type-safe conditional logic:

```ts
if (window.napplet.shell.supports('nap:relay')) {
  // relay operations are available
}

if (window.napplet.shell.supports('nap:identity')) {
  // identity queries are available
}

if (window.napplet.shell.supports('nap:config')) {
  // NAP-CONFIG is available -- schema registration and subscribe()
}

if (window.napplet.shell.supports('nap:resource')) {
  // resource.bytes(url) is available; check per-scheme too:
  if (window.napplet.shell.supports('resource:scheme:blossom')) { /* ... */ }
}

if (window.napplet.shell.supports('nap:connect')) {
  // NAP-CONNECT is available -- window.napplet.connect reflects shell grant state
  // Check per-scheme operator policy:
  if (window.napplet.shell.supports('connect:scheme:http')) { /* cleartext http: origins permitted */ }
  if (window.napplet.shell.supports('connect:scheme:ws'))   { /* cleartext ws: origins permitted */ }
}

if (window.napplet.shell.supports('nap:class')) {
  // NAP-CLASS is available -- window.napplet.class will be populated by class.assigned
}
```

## Runtime Guard

If `window.napplet` is not installed when an SDK method is called, a clear error is thrown:

```
Error: window.napplet not installed -- import @napplet/shim first
```

This protects against importing `@napplet/sdk` without the side-effect shim import.

## SDK vs Shim

| | `@napplet/sdk` | `@napplet/shim` |
|---|---|---|
| **Import style** | `import { relay } from '@napplet/sdk'` | `import '@napplet/shim'` (side-effect) |
| **What it does** | Named exports wrapping `window.napplet` | Installs `window.napplet` + shell registration |
| **Dependencies** | `@napplet/core` (types only) | None (types from `@napplet/core`) |
| **Side effects** | None | Yes -- installs globals, registers with shell |
| **Required** | Optional convenience | Required in every napplet |

**Typical usage:** Import both -- shim for runtime, SDK for developer API:

```ts
import '@napplet/shim';                                                  // required: installs window.napplet
import { relay, ifc, storage, keys, media, notify } from '@napplet/sdk';  // optional: typed API
```

If you are writing a vanilla napplet with no build step, use `window.napplet.*` directly after importing the shim -- the SDK is not required.

## Protocol Reference

- [NIP-5D](../../specs/NIP-5D.md) -- Napplet-shell protocol specification
- [@napplet/shim](../shim/) -- Window installer package
- [@napplet/core](../core/) -- Shared protocol types

## License

MIT
