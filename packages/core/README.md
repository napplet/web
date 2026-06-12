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

The `type` field domain prefix (`relay`, `identity`, `storage`, `ifc`, `theme`, `keys`, `media`, `notify`, `config`, `resource`, `connect`, `class`) routes messages to the correct NAP handler via `dispatch()`.

#### `NapDomain`

String literal union of the twelve NAP capability domains.

```ts
type NapDomain = 'relay' | 'identity' | 'storage' | 'ifc' | 'theme' | 'keys' | 'media' | 'notify' | 'config' | 'resource' | 'connect' | 'class';
```

| Domain    | Scope                                    |
|-----------|------------------------------------------|
| `relay`    | Relay proxy (subscribe, publish, query)   |
| `identity` | Read-only user identity queries           |
| `storage`  | Scoped key-value storage proxy            |
| `ifc`     | Inter-frame communication (dispatch + channel) |
| `theme`   | Theme tokens and appearance settings      |
| `keys`    | Keyboard forwarding and action keybindings|
| `media`   | Ownership-aware media session control     |
| `notify`  | Shell-rendered notifications              |
| `config`  | Per-napplet declarative configuration (JSON Schema-driven) |
| `resource` | Byte-fetching primitive (URL to Blob) |
| `connect` | User-gated direct network access |
| `class`   | Shell-assigned napplet class / security posture |

#### `NAP_DOMAINS`

Runtime constant array of all NAP domain strings. Useful for iteration and validation.

```ts
const NAP_DOMAINS: readonly NapDomain[] = ['relay', 'identity', 'storage', 'ifc', 'theme', 'keys', 'media', 'notify', 'config', 'resource', 'connect', 'class'];

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
window.napplet.shell.supports('ifc', 'NAP-01');
```

#### `NappletGlobalShell`

Type for the `window.napplet.shell` namespace. Extends `ShellSupports`.

```ts
interface NappletGlobalShell extends ShellSupports {}
```

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

Handle returned by `relay.subscribe()` and `ifc.on()`.

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

The `TOPICS` object contains string constants for IFC topic-based routing. These are legacy constants from the pre-envelope era — with JSON envelope messages, topic strings are passed directly in `ifc.emit` and `ifc.subscribe` payloads.

```ts
import { TOPICS } from '@napplet/core';

TOPICS.STATE_GET                // 'shell:state-get'
TOPICS.SHELL_CONFIG_GET         // 'shell:config-get'
TOPICS.WM_FOCUSED_WINDOW_CHANGED // 'wm:focused-window-changed'
// ... see source for full list
```

> **Note:** With JSON envelope wire format (v0.16.0+), state operations use `storage.*` messages directly rather than IFC topic routing. These constants are retained for backward compatibility with shell runtime implementations.

---

## Types

```ts
import type {
  NappletMessage, NapDomain, NamespacedCapability, NapProtocolId, ShellSupports, NappletGlobalShell,
  NapHandler, NapDispatch,
  NostrEvent, NostrFilter, Capability,
  Subscription, EventTemplate, NappletGlobal,
} from '@napplet/core';
```

| Type | Description |
|------|-------------|
| `NappletMessage` | Base interface for all JSON envelope messages |
| `NapDomain` | Union of the twelve NAP domain strings |
| `NamespacedCapability` | Union of `NapDomain \| nap:* \| perm:*` for `supports()` |
| `NapProtocolId` | Numbered NAP protocol id such as `NAP-01` for the optional second `supports()` argument |
| `ShellSupports` | Interface with `supports()` capability query method |
| `NappletGlobalShell` | Type for `window.napplet.shell` (extends `ShellSupports`) |
| `NapHandler` | Callback type for domain handlers |
| `NapDispatch` | Interface returned by `createDispatch()` |
| `NostrEvent` | Nostr event structure |
| `NostrFilter` | Subscription filter for relay NAP |
| `Capability` | Human-readable capability string union |
| `Subscription` | Handle with `close()` returned by subscribe/on |
| `EventTemplate` | Unsigned event template for publishing |

## Integration Note

`@napplet/core` is consumed by all packages in the napplet ecosystem for envelope types and NAP dispatch.

- **In this repo:** `@napplet/shim`, `@napplet/sdk`, and `@napplet/vite-plugin` import `NappletMessage`, `NapDomain`, `ShellSupports`, and all shared protocol types from `@napplet/core`.
- **`@napplet/nap` domain modules** (`@napplet/nap/relay`, `@napplet/nap/identity`, `@napplet/nap/storage`, `@napplet/nap/ifc`, `@napplet/nap/keys`, `@napplet/nap/media`, `@napplet/nap/notify`, `@napplet/nap/config`): extend `NappletMessage` for their domain-specific message types and call `registerNap` at import time. (The `@napplet/nap/theme` barrel is types-only — no `registerNap` side effect.)

## Protocol Reference

- [NIP-5D](../../specs/NIP-5D.md) -- Napplet-shell protocol specification

## License

MIT
