# Core concepts

These are the ideas that recur across every `@napplet/*` package. Understanding them once makes the rest of the docs straightforward.

## The JSON envelope

Every message between a napplet and its shell is a JSON object with a `type` field in `domain.action` format:

```ts
{ type: "domain.action", ...payload }
```

The shim sends outbound messages with `window.parent.postMessage(msg, '*')` and listens for inbound ones with `window.addEventListener('message', …)`. Request / response pairs are correlated by an `id` field. The base type is [`NappletMessage`](/packages/core) in `@napplet/core`; each NAP domain extends it with its own concrete message types.

```ts
// outbound: napplet -> shell
{ type: 'outbox.publish', id: 'q1', event: { /* EventTemplate */ } }

// inbound: shell -> napplet
{ type: 'outbox.publish.result', id: 'q1', ok: true, event: { /* NostrEvent */ } }
```

Unrecognized message types are silently ignored, which is what lets a napplet talk to an older or smaller shell and degrade gracefully.

## NAPs

A **NAP** (*Nostr Applet Protocol*) is one capability contract between a napplet and its runtime: it defines a message domain, the valid `type` strings within it, the payload shapes, and the expected shell behavior. A NAP named `foo` owns all `foo.*` messages. NAP contracts are proposed and maintained in the [NAPs track](https://github.com/napplet/naps).

In this SDK, each NAP is a **domain** — `relay`, `storage`, `inc`, `identity`, and so on — implemented as a subpath of [`@napplet/nap`](/packages/nap). The core dispatcher routes inbound messages to the right handler by domain prefix via `registerNap(domain, handler)` and `dispatch(message)`.

See the [NAP domain reference](/naps/) for the full list.

## Convention identities and URI bindings

`napplet:<archetype>/<intent>` is the stable convention identity. Manifest contracts, subscriptions, handler metadata, discovery, normalized wire messages, and routing use the complete queryless string with exact equality.

INC `emit(topic, payload?)` is the developer-facing convention URI boundary. A queried URI such as `napplet:profile/open?pubkey=abc123` is normalized before `postMessage`: unique percent-decoded pairs become text payload fields, while literal `+` remains `+`. Fragments, malformed encoding, repeated decoded names, and a query combined with an explicit payload reject. Structured data uses an explicit payload with a queryless URI.

Intent calls derive archetype and action from the URI. An `ok: true` result means the runtime accepted delivery responsibility and includes the normalized identity and handler catalog identifier; an `ok: false` result includes `error`. Targets receive runtime-attested `IntentDelivery` values through `onDelivery`, including deliveries retained before registration. Behavior hints are `focus` and `reuse`. This non-normative guidance defers to the living [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md).

```ts
const result = await window.napplet.intent.open('napplet:profile/open', { payload: { pubkey: 'abc123' } });
if (!result.ok) console.error(result.error);
```

Delivery does not depend on the source staying alive or on NAP-INC. Target startup/reuse, overlap, replacement, retry, and persistence remain runtime policy.

This non-normative guide defers to the living [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md), [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md), and [web projection](https://github.com/napplet/naps/blob/master/projections/web.md).

## The shell

The **shell** is the trusted host application. It brokers signing — to a remote signer (NIP-46), a browser extension (NIP-07), or its own key management — plus relay access and persistent storage, and it hosts napplets in sandboxed iframes. Every sensitive operation a napplet wants — publish an event, read storage, fetch external bytes — is a request to the shell, which enforces policy, brokers it to wherever the capability is handled, and responds. Keys live wherever the shell delegates them; the napplet never sees them.

The reference runtime is **Kehto** ([github.com/kehto/web](https://github.com/kehto/web)). Any compatible shell can host any napplet.

## The sandbox model

Napplets run in an iframe sandboxed with **`allow-scripts` only** — crucially **no `allow-same-origin`**. (Shells MAY add tokens like `allow-forms` or `allow-popups` per their own policy.) The consequences:

- No real origin, so no service worker registration, no same-origin storage.
- No access to the shell's DOM, cookies, `localStorage`, `sessionStorage`,
  `IndexedDB`, or service workers.
- No direct WebSocket / `fetch` to arbitrary origins (the shell's CSP enforces
  this). External bytes are fetched through the
  [resource NAP](/naps/#resource) instead.

All persistent and privileged state flows through the shell's proxies. The browser enforces the boundary — it is not a matter of the napplet behaving.

## Identity

The shell assigns each napplet an identity **at iframe creation time**, with no handshake. It maps the iframe's `Window` reference to the napplet's `(dTag, artifactHash)` tuple verified against the NIP-5D manifest and verifies `MessageEvent.source` on **every** inbound message. `MessageEvent.source` is unforgeable, so this is how the shell knows which napplet a message came from. Messages from unmapped windows are silently dropped.

## ACL and storage

Shells enforce capability, consent and storage policy using the verified napplet identity and each NAP's contract. NIP-5D's current identity is `(dTag, artifactHash)`, where `artifactHash` covers the artifact bytes alone. Any metadata embedded in the HTML participates in that digest; event-only metadata does not. Domain declarations do not grant authority.

Moving from legacy aggregate hashes changes identity keys even when artifact bytes stay the same. Shell maintainers need an explicit migration policy for existing saved data and grants; the SDK does not silently copy them. See [event migration](/guide/event-migration) and the living [NAP contracts](https://github.com/napplet/naps) for domain-specific behavior.

## Domain Presence

Because shells implement only the NAP domains they choose to, a napplet must **feature-gate** before using a domain. NIP-5D runtimes inject `window.napplet` before napplet code runs; each available NAP domain is present as a property, and unavailable domains are absent:

```ts
if (window.napplet?.relay) { /* relay ops available */ }
if (window.napplet?.identity) { /* identity queries available */ }
if (window.napplet?.inc) { /* … */ }
```

This pairs with declarative negotiation: declare what you need in the manifest (`R` tags via [`@napplet/vite-plugin`](/packages/vite-plugin)), and gate at runtime with property presence. Always degrade gracefully when a capability is absent.