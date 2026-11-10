# NIP-5D explained

[NIP-5D — *Nostr Web Applets*](#source-of-truth) is the specification that defines how a napplet and its host shell talk to each other. This page summarizes the model the `@napplet/*` packages implement.

::: warning NON-NORMATIVE — read the spec
This page is an orientation, not the specification. The living, authoritative
documents are **[NIP-5D (PR #2303)](https://github.com/nostr-protocol/nips/pull/2303)**
and the **[NAPs track](https://github.com/napplet/naps)**. For every normative
requirement ("MUST", message shapes, manifest fields), defer to those — not to
this page, the packages, or any test.
:::

## Philosophy

- Napplets are **small and single-purpose** rather than monolithic — a chat
  widget, a feed viewer, a profile editor, a relay manager are each separate
  applications.
- The **shell composes** multiple napplets; napplets do not compose themselves.
- The protocol is intentionally minimal: a JSON envelope over `postMessage`, with
  capabilities layered on top through an extension framework.

## Terminology

| Term | Meaning |
| --- | --- |
| **Shell** | The trusted hosting web application that contains napplet iframes. |
| **Napplet** | A sandboxed iframe application that communicates via `postMessage`. |
| **dTag** | The napplet type identifier from its NIP-5D manifest. |
| **Artifact hash** | SHA-256 of the final `/index.html` bytes. |
| **NAP** | *Nostr Applet Protocol* — one capability contract between a napplet and its runtime, defining the protocol messages for a capability domain. |

> In this SDK, each NAP is a **domain** that owns one message domain (`relay`,
> `storage`, `identity`, …). NAP contracts live in the
> [NAPs track](https://github.com/napplet/naps).

## Transport

- Before any napplet script runs, the shell-injected bootstrap creates a `MessageChannel`, keeps one port private, and hands the other to the shell exactly once: `window.parent.postMessage({ type: "napplet.hello" }, '*', [port])`.
- That handoff is the only window-level message a napplet sends. Every NAP message in both directions travels over the port. Shells do not send NAP messages with `iframeWindow.postMessage` and do not transfer a port into the iframe.
- Napplets MUST be embedded with `sandbox="allow-scripts"` and **without**
  `allow-same-origin`.
- Napplets have **no access** to `localStorage`, `sessionStorage`, `IndexedDB`,
  direct WebSocket connections, or signing keys.
- Shells MUST **not** provide `window.nostr` (NIP-07). Signing and encryption are
  brokered by the shell instead — to a remote signer, an extension, or the shell's
  own key management, depending on the shell.

## Wire format

Every message is a JSON object with a `type` field in `domain.action` format:

```ts
{ type: "<domain>.<action>", ...payload }
```

Request/response pairs are correlated by an `id` field:

```ts
// request
{ type: "outbox.query", id: "abc", filters: [{ kinds: [1] }] }

// a result arrives back with a matching id
{ type: "outbox.query.result", id: "abc", events: [{ event: { /* NostrEvent */ } }] }
```

The `type` prefix before the first `.` is the **domain**, and routes the message to the correct NAP handler. **Unrecognized message types are silently ignored** for forward compatibility — a napplet can speak to an older shell and degrade gracefully.

## Identity

- The shell computes `(dTag, artifactHash)` from the signed NIP-5D manifest and the verified artifact bytes **before** the iframe runs, and injects those bytes with the bootstrap via `srcdoc`.
- It accepts a `napplet.hello` only when `MessageEvent.source` is the `contentWindow` of an iframe it created and exactly one port is attached, and binds the identity to **that port**. Origin checks use the port binding, not `event.origin`.
- Identity belongs to the verified **document**, not the iframe or its `Window`: a `Window` survives same-frame navigation and an injected `meta` CSP does not carry over, so a napplet could otherwise replace itself with unverified content and keep its grants.
- A second hello, any other window-level message, a second `load` event or the port closing tells the shell the document was replaced. The shell closes the port, revokes the identity and every grant attached to it, and removes the iframe. It may then create a fresh iframe from the verified bytes.

## Manifest and NAP negotiation

The current manifest kinds are 5129, 15129, and 35129. The manifest carries one direct artifact hash in `x`, description text in `content`, required domains in `R`, and optional integrations in `O`. Archetype advertisements use `z`; accepted intents and parameter names use `i`. Optional presentation metadata rides on the same event: one content-addressed `icon`, any number of `screenshot` tags and at most one `preview` video (NIP-92 `key value` fields keyed by the blob's `x` hash), plus `source`, `source-commit` and `source-archive` pins; `server` tags hint where those blobs live. See [NIP-5D §Manifest](https://github.com/dskvr/nips/blob/nip/5d/5D.md#manifest) for the complete living contract.

The plugin generates current events and the CLI offers temporary legacy output. See [event migration](/guide/event-migration) for release cutoffs and rollout implications. Runtime availability still comes from injected domain presence, such as `window.napplet?.relay`.

## NAP extension framework

- A NAP spec defines a message **domain**, the valid `type` strings within it,
  the payload shapes, and the expected shell behavior.
- A NAP named `foo` owns **all** `foo.*` message types.
- Each NAP must be **independently implementable**, and shells may support any
  subset of NAPs.

This is what makes the protocol modular: NAP contracts live in the [NAPs track](https://github.com/napplet/naps); see the [NAP domain reference](/naps/) for the domains this SDK ships.

## Convention URI projection

The stable convention identity is the complete queryless `napplet:<archetype>/<intent>` string. Archetype manifest tags, subscriptions, handler discovery, normalized messages, and routing contain that identity and use exact equality.

The web binding normalizes developer-facing URI input before `postMessage` for INC `emit(topic, payload?)`. Unique percent-decoded query pairs become text payload fields, literal `+` remains `+`, and the outgoing topic is queryless. Fragments, malformed percent encoding, repeated decoded names, and a query combined with explicit payload reject. Structured/non-text data uses a queryless URI with an explicit payload.

Intent calls derive archetype and action from the URI. An `ok: true` result means the runtime accepted delivery responsibility and includes the normalized identity and handler catalog identifier; an `ok: false` result includes `error`. Targets receive runtime-attested `IntentDelivery` values through `onDelivery`, including deliveries retained before registration. `sender` is the runtime-attested source catalog identifier. A shell replay to a selected instance is an ordinary delivery whose `sender` is the target's own catalog identifier. Deliveries carry no `id`. This follows the [NAP-INTENT selected-instance delivery draft](https://github.com/napplet/naps/pull/128). Behavior hints are `focus` and `reuse`. This non-normative guidance defers to the living [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md).

At this web projection's trust boundary, the host authenticates the napplet by the port bound in `napplet.hello` and derives the NAP-level `sender` from that endpoint. A napplet does not provide sender. On other carriers the endpoint mechanism differs, while the runtime-attested sender contract stays the same. Receivers treat sender as provenance and payload as untrusted.

This non-normative guide defers to the living [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md), [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md), and [web projection](https://github.com/napplet/naps/blob/master/projections/web.md).

## Security model

- Napplets are **untrusted**; the shell is **trusted**; the **browser** enforces
  the iframe sandbox boundary.
- Adding `allow-same-origin` would grant the napplet a real origin (letting it
  register a service worker, reach same-origin storage, etc.) — so it is
  **prohibited**.
- The port handed over in `napplet.hello` is the sender identity. Only the verified document's bootstrap holds the other end, so a navigated or reloaded document has no NAP channel, identity or grants.
- An injected `meta` CSP does not restrict a document navigating its own frame, so a napplet can disclose data it was given by encoding it in a navigation URL. Revocation stops further access but cannot recall what was sent; shells should treat data released to a napplet as disclosable by it.
- Shells MUST **not** sign or broadcast events containing ciphertext received
  from a napplet.
- The protocol does **not** protect against compromised browsers, malicious
  shells, or social engineering — it secures the napplet-shell boundary, not the
  shell itself.

## Source of truth

This page is a **non-normative** summary. The living, authoritative documents are:

- **NIP-5D** (the protocol):
  [github.com/nostr-protocol/nips/pull/2303](https://github.com/nostr-protocol/nips/pull/2303)
- **NAPs track** (the capability domains):
  [github.com/napplet/naps](https://github.com/napplet/naps)

For every normative requirement, read those — not this page. See [NIP-5D spec status](/spec) for how drift is tracked.