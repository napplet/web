# Core concepts

These are the ideas that recur across every `@napplet/*` package. Understanding
them once makes the rest of the docs straightforward.

## The JSON envelope

Every message between a napplet and its shell is a JSON object with a `type`
field in `domain.action` format:

```ts
{ type: "domain.action", ...payload }
```

The shim sends outbound messages with `window.parent.postMessage(msg, '*')` and
listens for inbound ones with `window.addEventListener('message', …)`. Request /
response pairs are correlated by an `id` field. The base type is
[`NappletMessage`](/packages/core) in `@napplet/core`; each NAP domain extends it
with its own concrete message types.

```ts
// outbound: napplet → shell
{ type: 'relay.publish', id: 'q1', event: { /* EventTemplate */ } }

// inbound: shell → napplet
{ type: 'relay.publish.result', id: 'q1', ok: true, event: { /* NostrEvent */ } }
```

Unrecognized message types are silently ignored, which is what lets a napplet
talk to an older or smaller shell and degrade gracefully.

## NAPs and NUBs

A **NUB** (*Napplet Unified Blueprint*) is the spec-level extension unit: it
defines a message domain, the valid `type` strings within it, the payload shapes,
and the expected shell behavior. A NUB named `foo` owns all `foo.*` messages.

In this SDK, the runtime surface of a NUB is a **NAP domain**. Each NAP domain
owns one message domain — `relay`, `storage`, `inc`, `identity`, and so on — and
is implemented as a subpath of [`@napplet/nap`](/packages/nap). The core
dispatcher routes inbound messages to the right handler by domain prefix via
`registerNap(domain, handler)` and `dispatch(message)`.

See the [NAP domain reference](/naps/) for the full list.

## The shell

The **shell** is the trusted host application. It brokers signing — to a remote
signer (NIP-46), a browser extension (NIP-07), or its own key management — plus
relay access and persistent storage, and it hosts napplets in sandboxed iframes.
Every sensitive operation a napplet wants — publish an event, read storage, fetch
external bytes — is a request to the shell, which enforces policy, brokers it to
wherever the capability is handled, and responds. Keys live wherever the shell
delegates them; the napplet never sees them.

The reference runtime is **Kehto**
([github.com/kehto/web](https://github.com/kehto/web)). Any
compatible shell can host any napplet.

## The sandbox model

Napplets run in an iframe sandboxed with **`allow-scripts` only** — crucially
**no `allow-same-origin`**. (Shells MAY add tokens like `allow-forms` or
`allow-popups` per their own policy.) The consequences:

- No real origin, so no service worker registration, no same-origin storage.
- No access to the shell's DOM, cookies, `localStorage`, `sessionStorage`,
  `IndexedDB`, or service workers.
- No direct WebSocket / `fetch` to arbitrary origins (the shell's CSP enforces
  this). External bytes are fetched through the
  [resource NAP](/naps/#resource) instead.

All persistent and privileged state flows through the shell's proxies. The
browser enforces the boundary — it is not a matter of the napplet behaving.

## Identity

The shell assigns each napplet an identity **at iframe creation time**, with no
handshake. It maps the iframe's `Window` reference to the napplet's
`(dTag, aggregateHash)` tuple from the NIP-5A manifest and verifies
`MessageEvent.source` on **every** inbound message. `MessageEvent.source` is
unforgeable, so this is how the shell knows which napplet a message came from.
Messages from unmapped windows are silently dropped.

## ACL — capabilities

The shell enforces an Access Control List keyed on `(dTag, aggregateHash)`. This
controls what a given napplet build is allowed to do: signing, storage access,
relay read/write, and so on. Because the key includes the **aggregate hash**, a
different build of the same napplet type is treated as a distinct subject — any
change to the build (or to declared `connect` origins / config schema, which fold
into the hash) re-triggers the shell's consent and re-scopes prior grants.

The human-readable capability strings are exported from `@napplet/core` as the
[`Capability`](/packages/core) union (`relay:read`, `relay:write`, `sign:event`,
`state:read`, …).

## Storage scoping

Storage is proxied through the shell and **scoped by `dTag:aggregateHash`**, so
different napplet types — and different versions of the same type — have isolated
storage and cannot read each other's data. There is a per-napplet quota (the shim
documents 512 KB). Access is via `window.napplet.storage` (`getItem`, `setItem`,
`removeItem`, `keys`).

## `shell.supports()`

Because shells implement only the NAP domains they choose to, a napplet must
**feature-gate** before using a domain:

```ts
import '@napplet/shim';

// NAP domains — bare shorthand or the nap: prefix
if (window.napplet.shell.supports('relay')) { /* relay ops available */ }
if (window.napplet.shell.supports('nap:identity')) { /* identity queries available */ }

// Permissions
if (window.napplet.shell.supports('perm:popups')) { /* … */ }

// Numbered NAP-NN message protocols over an interface
if (window.napplet.shell.supports('inc', 'NAP-01')) { /* … */ }
```

This pairs with declarative negotiation: declare what you need in the manifest
(`requires` tags via [`@napplet/vite-plugin`](/packages/vite-plugin)), and gate at
runtime with `supports()`. Always degrade gracefully when a capability is absent.
