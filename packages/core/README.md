# @napplet/core

> JSON envelope types and NAP dispatch infrastructure for the napplet ecosystem.

## Getting Started

### Package Overview

This package is the single source of truth for all protocol-level definitions in the napplet ecosystem. All other `@napplet/*` packages import their envelope types, dispatch infrastructure, and protocol constants from here.

Zero dependencies. No DOM or browser APIs. Works in any JavaScript runtime.

### Installation

```bash
npm install @napplet/core
```

## Quick Start

```ts
import {
  type NappletMessage, type NapDomain, type NapProtocolId, type ShellSupports,
  type NapHandler, type NapDispatch,
  NAP_DOMAINS, SHELL_BRIDGE_URI, PROTOCOL_VERSION,
  createDispatch, registerNap, dispatch, getRegisteredDomains,
  ALL_CAPABILITIES, TOPICS,
} from '@napplet/core';
```

## API Reference

### Envelope Types

The JSON envelope wire format is the primary API introduced in NIP-5D v4. All messages between napplet and shell use a `type` field as a discriminant in `domain.action` format.

#### `NappletMessage`

Base interface for all messages exchanged between napplet and shell.

```ts
interface NappletMessage {
  /** Message type discriminant in "domain.action" format */
  type: string;
}
```

Concrete message types extend this interface with domain-specific payload fields:

```ts
// Example concrete message type:
interface RelaySubscribe extends NappletMessage {
  type: 'relay.subscribe';
  id: string;
  subId: string;
  filters: NostrFilter[];
}
```

The `type` field domain prefix (`relay`, `identity`, `storage`, `inc`, `theme`, `keys`, `media`, `notify`, `config`, `resource`, `cvm`, `outbox`, `upload`, `intent`, `pow`) routes messages to the correct NAP handler via `dispatch()`.
The `type` field domain prefix (`relay`, `identity`, `storage`, `inc`, `theme`, `keys`, `media`, `notify`, `config`, `resource`, `cvm`, `outbox`, `upload`, `intent`, `serial`) routes messages to the correct NAP handler via `dispatch()`.

#### `NapDomain`

String literal union of the NAP capability domains.

```ts
type NapDomain = 'relay' | 'identity' | 'storage' | 'inc' | 'theme' | 'keys' | 'media' | 'notify' | 'config' | 'resource' | 'cvm' | 'outbox' | 'upload' | 'intent' | 'pow';
type NapDomain = 'relay' | 'identity' | 'storage' | 'inc' | 'theme' | 'keys' | 'media' | 'notify' | 'config' | 'resource' | 'cvm' | 'outbox' | 'upload' | 'intent' | 'serial';
```

| Domain    | Scope                                    |
|-----------|------------------------------------------|
| `relay`    | Relay proxy (subscribe, publish, query)   |
| `identity` | Read-only user identity queries           |
| `storage`  | Scoped key-value storage proxy            |
| `inc`     | Inter-napplet communication (dispatch + channel) |
| `theme`   | Theme tokens and appearance settings      |
| `keys`    | Keyboard forwarding and action keybindings|
| `media`   | Ownership-aware media session control     |
| `notify`  | Shell-rendered notifications              |
| `config`  | Per-napplet declarative configuration (JSON Schema-driven) |
| `resource` | Byte-fetching primitive (URL to Blob) |
| `pow` | NIP-13 proof-of-work mining jobs |
| `serial`  | Runtime-mediated serial device access |

#### `NAP_DOMAINS`

Runtime constant array of all NAP domain strings. Useful for iteration and validation.

```ts
const NAP_DOMAINS: readonly NapDomain[] = ['relay', 'identity', 'storage', 'inc', 'theme', 'keys', 'media', 'notify', 'config', 'resource', 'cvm', 'outbox', 'upload', 'intent', 'pow'];
const NAP_DOMAINS: readonly NapDomain[] = ['relay', 'identity', 'storage', 'inc', 'theme', 'keys', 'media', 'notify', 'config', 'resource', 'cvm', 'outbox', 'upload', 'intent', 'serial'];

for (const domain of NAP_DOMAINS) {
  console.log(`Checking support for: ${domain}`);
}
```

#### `ShellSupports`

Interface for the shell capability query API.

```ts
interface ShellSupports {
  supports(capability: NapDomain | string, protocol?: `NAP-${number}`): boolean;
}
```

Napplets call `window.napplet.shell.supports(domain)` to check whether the shell
declared support for a NAP domain before using that domain's API. For numbered
NAP-NN message protocols, pass the protocol identifier as the optional second
argument:

```ts
window.napplet.shell.supports('inc', 'NAP-01');
```

#### `NappletShell` — NAP-SHELL (foundational handshake)

Type for the `window.napplet.shell` namespace. `shell` is the **foundational,
mandatory** NAP domain — the one capability that cannot be discovered via
`supports()` (and is not a member of `NAP_DOMAINS`). The shim posts `shell.ready`
(no payload); the runtime replies **once** with `shell.init` carrying the
environment `{ capabilities: { domains, protocols }, services }`; the shim
caches it so `supports(domain, protocol?)` answers **synchronously and locally**
thereafter (`false` before init and for any unknown domain/protocol).

```ts
interface NappletShell {
  supports(domain: string, protocol?: string): boolean;
  readonly services: readonly string[];
  ready(): Promise<ShellEnvironment>;   // resolves once the environment is delivered
  onReady(handler: (env: ShellEnvironment) => void): Subscription;
}

interface ShellEnvironment {
  capabilities: ShellCapabilities;
  services: string[];
}

interface ShellCapabilities {
  domains: string[];
  protocols: Record<string, string[]>;
}
```

```ts
// Synchronous, local capability queries (no wire round-trip):
window.napplet.shell.supports('relay');        // true if the runtime offers relay
window.napplet.shell.supports('inc', 'NAP-2'); // true if it also speaks NAP-2

// Gate startup on the environment:
const env = await window.napplet.shell.ready();
const sub = window.napplet.shell.onReady((e) => start(e));
```

The `@napplet/nap/shell` subpath re-exports these types alongside `DOMAIN`.

---

### NAP Dispatch Infrastructure

The dispatch system allows NAP modules to self-register at import time. Inbound messages are routed to the correct NAP handler based on the domain prefix extracted from `message.type` (the part before the first `.`). The exported helper names (`registerNap`, `NapHandler`, `NapDispatch`) are retained for package compatibility.

#### `createDispatch()`

Factory that returns an isolated `{ registerNap, dispatch, getRegisteredDomains }` backed by its own `Map<string, NapHandler>`. Use for testing or multi-instance scenarios.

```ts
function createDispatch(): NapDispatch;
```

```ts
import { createDispatch } from '@napplet/core';

const { registerNap, dispatch } = createDispatch();
registerNap('relay', handleRelayMessage);
dispatch({ type: 'relay.subscribe' }); // true
```

#### `registerNap(domain, handler)`

Register a handler for a NAP domain on the module-level singleton registry. NAP modules call this at import time.

```ts
const registerNap: (domain: string, handler: NapHandler) => void;
```

```ts
import { registerNap } from '@napplet/core';

registerNap('relay', (msg) => {
  // handles all relay.* messages
  console.log('relay message:', msg.type);
});
```

Throws if the domain is already registered.

#### `dispatch(message)`

Dispatch a message to the handler matching its domain prefix. Returns `true` if a handler was found and called.

```ts
const dispatch: (message: NappletMessage) => boolean;
```

```ts
import { dispatch } from '@napplet/core';

dispatch({ type: 'relay.subscribe' });  // true (if relay handler registered)
dispatch({ type: 'unknown.action' });   // false
dispatch({ type: 'malformed' });         // false (no dot)
```

The domain is extracted by splitting `message.type` on the first `.`. A type with no `.` or an empty domain prefix returns `false` without throwing.

#### `getRegisteredDomains()`

Return all currently registered domain strings from the singleton registry.

```ts
const getRegisteredDomains: () => string[];
```

```ts
import { getRegisteredDomains } from '@napplet/core';

getRegisteredDomains(); // ['relay', 'identity', 'storage']
```

#### `NapHandler`

Callback type for NAP message handlers.

```ts
type NapHandler = (message: NappletMessage) => void;
```

#### `NapDispatch`

Interface returned by `createDispatch()`.

```ts
interface NapDispatch {
  registerNap: (domain: string, handler: NapHandler) => void;
  dispatch: (message: NappletMessage) => boolean;
  getRegisteredDomains: () => string[];
}
```

---

### Protocol Types

Types shared by all napplet packages for Nostr event structures and the capability system.

#### `NostrEvent`

Standard Nostr event structure (used by relay NAP and identity NAP).

```ts
interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}
```

#### `NostrFilter`

Subscription filter (used by relay NAP for `relay.subscribe` and `relay.query`).

```ts
interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  [key: `#${string}`]: string[] | undefined; // tag filters, e.g. '#t', '#e'
}
```

#### `Capability`

String union type listing all 10 protocol capability strings.

```ts
type Capability =
  | 'relay:read' | 'relay:write'
  | 'cache:read' | 'cache:write'
  | 'hotkey:forward'
  | 'sign:event' | 'sign:nip04' | 'sign:nip44'
  | 'state:read' | 'state:write';
```

Shell implementations use bitfield constants (`CAP_*`) for fast runtime checks. `Capability` strings are the human-readable protocol-level representation.

#### `ALL_CAPABILITIES`

`readonly Capability[]` containing all 10 capability strings.

```ts
for (const cap of ALL_CAPABILITIES) {
  console.log(cap); // 'relay:read', 'relay:write', ...
}
```

#### `Subscription`

Handle returned by `relay.subscribe()` and `inc.on()`.

```ts
interface Subscription {
  close(): void;
}
```

#### `EventTemplate`

Unsigned event template passed to `relay.publish()`.

```ts
interface EventTemplate {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
}
```

---

### Protocol Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `PROTOCOL_VERSION` | `'4.0.0'` | Current napplet-shell protocol version (JSON envelope era, NIP-5D v4) |
| `SHELL_BRIDGE_URI` | `'napplet://shell'` | URI identifying the shell bridge in relay tags |
| `REPLAY_WINDOW_SECONDS` | `30` | Maximum event age (seconds) for replay protection |

---

### Topic Constants

The `TOPICS` object contains string constants for INC topic-based routing. These are legacy constants from the pre-envelope era — with JSON envelope messages, topic strings are passed directly in `inc.emit` and `inc.subscribe` payloads.

```ts
import { TOPICS } from '@napplet/core';

TOPICS.STATE_GET                // 'shell:state-get'
TOPICS.SHELL_CONFIG_GET         // 'shell:config-get'
TOPICS.WM_FOCUSED_WINDOW_CHANGED // 'wm:focused-window-changed'
// ... see source for full list
```

> **Note:** With JSON envelope wire format (v0.16.0+), state operations use `storage.*` messages directly rather than INC topic routing. These constants are retained for backward compatibility with shell runtime implementations.

---

## Types

```ts
import type {
  NappletMessage, NapDomain, NamespacedCapability, NapProtocolId, ShellSupports,
  NappletShell, ShellEnvironment, ShellCapabilities, ShellReadyMessage, ShellInitMessage,
  NapHandler, NapDispatch,
  NostrEvent, NostrFilter, Capability,
  Subscription, EventTemplate, NappletGlobal,
} from '@napplet/core';
```

| Type | Description |
|------|-------------|
| `NappletMessage` | Base interface for all JSON envelope messages |
| `NapDomain` | Union of the active NAP domain strings |
| `NamespacedCapability` | Union of `NapDomain \| nap:* \| perm:*` for `supports()` |
| `NapProtocolId` | Numbered NAP protocol id such as `NAP-01` for the optional second `supports()` argument |
| `ShellSupports` | Interface with `supports()` capability query method |
| `NappletShell` | NAP-SHELL type for `window.napplet.shell` (`supports`, `services`, `ready`, `onReady`) |
| `ShellEnvironment` | The `shell.init` environment: `{ capabilities, services }` |
| `ShellCapabilities` | The capability set `{ domains, protocols }` answering `supports()` |
| `ShellReadyMessage` / `ShellInitMessage` | NAP-SHELL wire message types |
| `NapHandler` | Callback type for domain handlers |
| `NapDispatch` | Interface returned by `createDispatch()` |
| `NostrEvent` | Nostr event structure |
| `NostrFilter` | Subscription filter for relay NAP |
| `Capability` | Human-readable capability string union |
| `Subscription` | Handle with `close()` returned by subscribe/on |
| `EventTemplate` | Unsigned event template for publishing |

## Boundary Helpers (clone-safety)

NAP shims cross the napplet ⇄ shell boundary by structured-cloning a JSON
envelope through `postMessage`. Framework reactive values — Svelte 5 `$state`,
Vue `reactive`, Solid stores — are `Proxy` objects that are **not** structured-
cloneable, so a naive `postMessage` throws `DataCloneError`, which gets silently
swallowed in async paths (the envelope never crosses the boundary). These
helpers make that loud or transparent.

| Export | Description |
|--------|-------------|
| `sendEnvelope(target, message, targetOrigin?)` | The single boundary chokepoint shims post through. Per the active mode it posts as-is, snapshot-recovers a non-cloneable arg, or throws a loud, synchronous, actionable error. |
| `toCloneableSnapshot(value)` | Deep snapshot stripping reactive proxies into plain objects/arrays while preserving binary (`Uint8Array`/`ArrayBuffer`), `Date`, `RegExp`, `Map`, `Set`, and cycles. Lossless for binary (unlike `JSON`); functions/symbols throw. |
| `setCloneMode(mode)` / `getCloneMode()` | `'auto'` (default: post as-is, snapshot-and-retry on `DataCloneError`, warn once), `'strict'` (throw, never recover), or `'snapshot'` (eagerly snapshot every envelope). |
| `clearCloneWarnings()` | Reset the once-per-type auto-recovery warnings. |

```ts
import { setCloneMode, toCloneableSnapshot } from '@napplet/core';

// Default 'auto' handles reactive state transparently on the failure path.
// Or normalize explicitly:
napplet.outbox.subscribe(toCloneableSnapshot(filters), { relays });
// Or globally:
setCloneMode('snapshot');
```

These are SDK plumbing only — identical plain envelopes reach the wire, so they
add no protocol surface.

## Integration Note

`@napplet/core` is consumed by all packages in the napplet ecosystem for envelope types and NAP dispatch.

- **In this repo:** `@napplet/shim`, `@napplet/sdk`, and `@napplet/vite-plugin` import `NappletMessage`, `NapDomain`, `ShellSupports`, and all shared protocol types from `@napplet/core`.
- **`@napplet/nap` domain modules** (`@napplet/nap/relay`, `@napplet/nap/identity`, `@napplet/nap/storage`, `@napplet/nap/inc`, `@napplet/nap/keys`, `@napplet/nap/media`, `@napplet/nap/notify`, `@napplet/nap/config`, `@napplet/nap/resource`, `@napplet/nap/cvm`, `@napplet/nap/outbox`, `@napplet/nap/upload`, `@napplet/nap/intent`, `@napplet/nap/pow`): extend `NappletMessage` for their domain-specific message types and call `registerNap` at import time.

## Protocol Reference

- [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) -- Napplet-shell protocol specification

## License

MIT
