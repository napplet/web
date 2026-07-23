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
  type NappletMessage, type NapDomain, type NappletGlobal,
  type NapHandler, type NapDispatch,
  type IntentContract, type IntentDelivery, type IntentInvokeOptions,
  type IntentResult,
  NAP_DOMAINS, SHELL_BRIDGE_URI, PROTOCOL_VERSION,
  createDispatch, registerNap, dispatch, getRegisteredDomains,
  ALL_CAPABILITIES, TOPICS,
} from '@napplet/core';
```

### Envelope types

- **`NappletMessage`** — base interface for every message: `{ type: string }` in
  `domain.action` format. Concrete message types extend it with payload fields.
- **`NapDomain`** — string literal union of the NAP capability domains
  (`'relay' | 'identity' | 'storage' | 'inc' | 'theme' | 'keys' | 'media' | 'notify' | 'config' | 'resource' | 'cvm' | 'outbox' | 'upload' | 'intent' | 'ble' | 'webrtc' | 'link' | 'count' | 'lists' | 'serial' | 'common' | 'dm'`).
- **`NappletGlobal`** — the runtime-injected `window.napplet` namespace with
  optional domain properties.
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

### Boundary helpers (clone-safety)

Every NAP shim crosses the napplet ⇄ shell boundary by structured-cloning a JSON
envelope through `postMessage`. Framework reactive values — Svelte 5 `$state`,
Vue `reactive`, Solid stores — are `Proxy` objects that are **not** structured-
cloneable, so a naive `postMessage` throws `DataCloneError`, which is silently
swallowed in async paths (the envelope never crosses). These helpers fix that.

- **`sendEnvelope(target, message, targetOrigin?)`** — the single boundary
  chokepoint the shims post through. Per the active clone mode it posts the
  envelope, recovers a non-cloneable argument via a snapshot, or throws a loud,
  actionable, synchronous error instead of swallowing it.
- **`toCloneableSnapshot(value)`** — deep snapshot that strips reactive proxies
  into plain objects/arrays while **preserving binary** (`Uint8Array`,
  `ArrayBuffer`), `Date`, `RegExp`, `Map`, `Set`, and cycles. Unlike a `JSON`
  round-trip it is lossless for binary; functions/symbols throw (never masked).
- **`setCloneMode(mode)`** / **`getCloneMode()`** — choose how arguments are
  treated: `'auto'` (default — post as-is, snapshot-and-retry on `DataCloneError`,
  warn once), `'strict'` (throw on `DataCloneError`, never recover), or
  `'snapshot'` (eagerly snapshot every envelope).
- **`clearCloneWarnings()`** — reset the once-per-type auto-recovery warnings.

```ts
import { setCloneMode, toCloneableSnapshot } from '@napplet/core';

// Default 'auto' just works — reactive state is snapshotted on the failure path.
napplet.outbox.subscribe(filters, { relays, timeoutMs: 3000 });

// Or normalize explicitly / eagerly:
napplet.outbox.subscribe(toCloneableSnapshot(filters), { relays });
setCloneMode('snapshot');
```

These helpers are SDK plumbing only — the bytes placed on the wire are identical
plain envelopes, so they add no protocol surface.

### Protocol types & constants

- **`NostrEvent`**, **`NostrFilter`**, **`EventTemplate`**, **`Subscription`** —
  shared Nostr structures used by NAP domains such as outbox, relay, and
  identity.
- **`Capability`** / **`ALL_CAPABILITIES`** — the human-readable capability strings
  (`relay:read`, `relay:write`, `sign:event`, `sign:nip44`, `state:read`, …).
- **`PROTOCOL_VERSION`** (`'4.0.0'`), **`SHELL_BRIDGE_URI`** (`'napplet://shell'`),
  **`REPLAY_WINDOW_SECONDS`** (`30`), and the legacy **`TOPICS`** routing constants.

### Convention boundaries

The stable identity is the complete, queryless
`napplet:<archetype>/<intent>` string. Manifest contracts advertise that
identity, optionally with same-tag `kind:<number>` discovery metadata exposed
as `IntentContract.eventKinds`. Routing and handler resolution use exact
equality: subscriptions, metadata, and normalized wire messages never contain
the query and never use prefix, wildcard, or query-aware matching.

The two developer-facing URI boundaries are INC `emit(topic, payload?)` and
intent `invoke/open(uri, options?)`. At either boundary, unique percent-decoded
query pairs become a shallow string-to-string payload before `postMessage`;
literal `+` remains `+`. The normalized topic or convention is queryless:

```ts
napplet.inc.emit('napplet:profile/open?pubkey=abc123');
napplet.inc.on('napplet:profile/open', (payload) => validateLocally(payload));

const accepted = await napplet.intent.open(
  'napplet:profile/open?pubkey=abc123',
);
if (!accepted.ok) throw new Error(accepted.error);

napplet.intent.onDelivery((delivery) => {
  // sender is runtime-attested provenance; payload remains untrusted.
  validateLocally(delivery.payload);
});
```

An `ok: true` result means the runtime accepted responsibility for delivery,
not that a target received or handled it. Target delivery is a later,
carrier-neutral `intent.deliver` push, independent of the source lifetime and
with no public NAP-INC dependency or delivery identifier. Fragments, malformed
percent encoding, repeated decoded names, and query parameters combined with an
explicit payload reject before posting. Structured or non-text data belongs in
an explicit payload with a queryless URI.

This package follows the exact draft heads for [NAP-INC PR #89
(`4593ce9`)](https://github.com/napplet/naps/pull/89/commits/4593ce9e301ce098fd3dad64206fcd6f144fa7af),
[the web projection PR #90
(`896c32c`)](https://github.com/napplet/naps/pull/90/commits/896c32c92deee68dc4d10fc1132b62df20cccb6f),
and [NAP-INTENT PR #91
(`a718915`)](https://github.com/napplet/naps/pull/91/commits/a718915ddefa2f03a0126579601f59d8bd86f7c4).

## Usage

Register a handler and dispatch a message through an isolated registry:

```ts
import { createDispatch } from '@napplet/core';

const { registerNap, dispatch } = createDispatch();

registerNap('outbox', (msg) => {
  // handles all outbox.* messages
  console.log('outbox message:', msg.type);
});

dispatch({ type: 'outbox.query', id: 'abc', filters: [{ kinds: [1] }] }); // true
dispatch({ type: 'unknown.action' });                                     // false
dispatch({ type: 'malformed' });                                           // false (no dot)
```

## See also

- [Core concepts](/guide/concepts) — the JSON envelope and NAP dispatch model
- [NIP-5D explained](/guide/nip-5d) — the wire format this package implements
