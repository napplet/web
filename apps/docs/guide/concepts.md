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
// outbound: napplet -> shell
{ type: 'outbox.publish', id: 'q1', event: { /* EventTemplate */ } }

// inbound: shell -> napplet
{ type: 'outbox.publish.result', id: 'q1', ok: true, event: { /* NostrEvent */ } }
```

Unrecognized message types are silently ignored, which is what lets a napplet
talk to an older or smaller shell and degrade gracefully.

## NAPs

A **NAP** (*Nostr Applet Protocol*) is one capability contract between a napplet
and its runtime: it defines a message domain, the valid `type` strings within it,
the payload shapes, and the expected shell behavior. A NAP named `foo` owns all
`foo.*` messages. NAP contracts are proposed and maintained in the
[NAPs track](https://github.com/napplet/naps).

In this SDK, each NAP is a **domain** — `relay`, `storage`, `inc`, `identity`, and
so on — implemented as a subpath of [`@napplet/nap`](/packages/nap). The core
dispatcher routes inbound messages to the right handler by domain prefix via
`registerNap(domain, handler)` and `dispatch(message)`.

See the [NAP domain reference](/naps/) for the full list.

## Convention identities and URI bindings

`napplet:<archetype>/<intent>` is the stable convention identity. Manifest
contracts, subscriptions, handler metadata, discovery, normalized wire
messages, and routing use the complete queryless string with exact equality.
Optional same-tag `kind:<number>` fields are discovery metadata for one
manifest contract; they are not part of the identity, and runtimes never infer
a kind from payload content.

INC `emit(topic, payload?)` and intent `invoke/open(uri, options?)` are the two
developer-facing URI boundaries. A queried URI such as
`napplet:profile/open?pubkey=abc123` is normalized before `postMessage`: unique
percent-decoded pairs become text payload fields, while literal `+` remains
`+`. Fragments, malformed encoding, repeated decoded names, and a query
combined with an explicit payload reject. Structured data uses an explicit
payload with a queryless URI.

INC subscribers use the normalized topic with exact matching. NAP-INTENT
invocation returns immediate acceptance or rejection; `ok: true` means the
runtime accepted responsibility, not that a target received or handled the
intent. The target later receives a separate, no-ID carrier-neutral delivery:

```ts
window.napplet.intent.onDelivery((delivery) => {
  // The runtime attests sender provenance; receivers validate payload.
  validateIntentPayload(delivery.convention, delivery.payload);
});

const result = await window.napplet.intent.open(
  'napplet:profile/open?pubkey=abc123',
);
```

Delivery does not depend on the source staying alive or on NAP-INC. Target
startup/reuse, overlap, replacement, retry, and persistence remain runtime
policy.

This is a non-normative orientation following the exact draft heads of
[NAP-INC PR #89
(`4593ce9`)](https://github.com/napplet/naps/pull/89/commits/4593ce9e301ce098fd3dad64206fcd6f144fa7af),
[the governance/web projection PR #90
(`896c32c`)](https://github.com/napplet/naps/pull/90/commits/896c32c92deee68dc4d10fc1132b62df20cccb6f),
and [NAP-INTENT PR #91
(`a718915`)](https://github.com/napplet/naps/pull/91/commits/a718915ddefa2f03a0126579601f59d8bd86f7c4).

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

## Domain Presence

Because shells implement only the NAP domains they choose to, a napplet must
**feature-gate** before using a domain. NIP-5D runtimes inject
`window.napplet` before napplet code runs; each available NAP domain is present
as a property, and unavailable domains are absent:

```ts
if (window.napplet?.relay) { /* relay ops available */ }
if (window.napplet?.identity) { /* identity queries available */ }
if (window.napplet?.inc) { /* … */ }
```

This pairs with declarative negotiation: declare what you need in the manifest
(`requires` tags via [`@napplet/vite-plugin`](/packages/vite-plugin)), and gate at
runtime with property presence. Always degrade gracefully when a capability is absent.
