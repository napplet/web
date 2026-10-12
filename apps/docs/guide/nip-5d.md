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

- Napplets send messages with `window.parent.postMessage(msg, '*')`; the shell
  replies with `iframeWindow.postMessage(msg, '*')`.
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

- The shell assigns a napplet's identity **at iframe creation time**, with no
  negotiation or handshake.
- It maps the iframe's `Window` reference to the napplet's `(dTag, artifactHash)`
  tuple, verified against the signed NIP-5D manifest and artifact bytes.
- The shell MUST verify `MessageEvent.source` on **every** inbound message.
  `MessageEvent.source` is an **unforgeable** sender identity — origin validation
  uses `source`, not `event.origin`.
- Messages from unmapped `Window` references are silently dropped.

## Manifest and NAP negotiation

The current manifest kinds are 5129, 15129, and 35129. The manifest carries one direct artifact hash in `x`, description text in `content`, required domains in `R`, and optional integrations in `O`. Archetype advertisements use `z`; accepted intents and parameter names use `i`. See [NIP-5D §Manifest](https://github.com/dskvr/nips/blob/nip/5d/5D.md#manifest) for the complete living contract.

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

Intent calls derive archetype and action from the URI. An `ok: true` result means the runtime accepted delivery responsibility and includes the normalized identity and handler catalog identifier; an `ok: false` result includes `error`. Targets receive runtime-attested `IntentDelivery` values through `onDelivery`, including deliveries retained before registration. Behavior hints are `focus` and `reuse`. This non-normative guidance defers to the living [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md).

At this web projection's trust boundary, the host authenticates the source iframe with `MessageEvent.source` and derives the NAP-level `sender` from that endpoint. A napplet does not provide sender. On other carriers the endpoint mechanism differs, while the runtime-attested sender contract stays the same. Receivers treat sender as provenance and payload as untrusted.

This non-normative guide defers to the living [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md), [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md), and [web projection](https://github.com/napplet/naps/blob/master/projections/web.md).

## Security model

- Napplets are **untrusted**; the shell is **trusted**; the **browser** enforces
  the iframe sandbox boundary.
- Adding `allow-same-origin` would grant the napplet a real origin (letting it
  register a service worker, reach same-origin storage, etc.) — so it is
  **prohibited**.
- `MessageEvent.source` provides the unforgeable sender identity used for origin
  validation.
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