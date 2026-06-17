# @napplet/core

> JSON envelope types and NAP dispatch infrastructure for the napplet ecosystem.

`@napplet/core` is the single source of truth for all protocol-level definitions.
Every other `@napplet/*` package imports its envelope types, dispatch
infrastructure, and protocol constants from here. It has **zero dependencies** and
no DOM or browser APIs — it works in any JavaScript runtime.

- **npm:** [`@napplet/core`](https://www.npmjs.com/package/@napplet/core)
- **JSR:** [`@napplet/core`](https://jsr.io/@napplet/core)
- **Source:** [packages/core](https://github.com/napplet/napplet/tree/main/packages/core)

## Install

```bash
npm install @napplet/core
```

## Key exports

```ts
import {
  type NappletMessage, type NapDomain, type NapProtocolId, type ShellSupports,
  type NapHandler, type NapDispatch,
  NAP_DOMAINS, SHELL_BRIDGE_URI, PROTOCOL_VERSION,
  createDispatch, registerNap, dispatch, getRegisteredDomains,
  ALL_CAPABILITIES, TOPICS,
} from '@napplet/core';
```

### Envelope types

- **`NappletMessage`** — base interface for every message: `{ type: string }` in
  `domain.action` format. Concrete message types extend it with payload fields.
- **`NapDomain`** — string literal union of the NAP capability domains
  (`'relay' | 'identity' | 'storage' | 'inc' | 'theme' | 'keys' | 'media' | 'notify' | 'config' | 'resource' | 'cvm' | 'outbox' | 'upload' | 'intent'`).
- **`ShellSupports`** / **`NappletGlobalShell`** — the `supports(capability, protocol?)`
  capability-query interface behind `window.napplet.shell`.
- **`NAP_DOMAINS`** — runtime constant array of all domain strings, for iteration
  and validation.

### Dispatch infrastructure

NAP modules self-register at import time; inbound messages route by the domain
prefix of `message.type` (the part before the first `.`).

- **`createDispatch()`** — factory returning an isolated
  `{ registerNap, dispatch, getRegisteredDomains }` backed by its own registry.
- **`registerNap(domain, handler)`** — register a handler on the module-level
  singleton registry (throws if the domain is already registered).
- **`dispatch(message)`** — route a message to its handler; returns `true` if one
  was found and called, `false` for an unknown or malformed type.
- **`getRegisteredDomains()`** — list registered domain strings.

### Protocol types & constants

- **`NostrEvent`**, **`NostrFilter`**, **`EventTemplate`**, **`Subscription`** —
  shared Nostr structures used by the relay and identity NAPs.
- **`Capability`** / **`ALL_CAPABILITIES`** — the human-readable capability strings
  (`relay:read`, `relay:write`, `sign:event`, `sign:nip44`, `state:read`, …).
- **`PROTOCOL_VERSION`** (`'4.0.0'`), **`SHELL_BRIDGE_URI`** (`'napplet://shell'`),
  **`REPLAY_WINDOW_SECONDS`** (`30`), and the legacy **`TOPICS`** routing constants.

## Usage

Register a handler and dispatch a message through an isolated registry:

```ts
import { createDispatch } from '@napplet/core';

const { registerNap, dispatch } = createDispatch();

registerNap('relay', (msg) => {
  // handles all relay.* messages
  console.log('relay message:', msg.type);
});

dispatch({ type: 'relay.subscribe' }); // true
dispatch({ type: 'unknown.action' });  // false
dispatch({ type: 'malformed' });        // false (no dot)
```

## See also

- [Core concepts](/guide/concepts) — the JSON envelope and NAP dispatch model
- [NIP-5D explained](/guide/nip-5d) — the wire format this package implements
