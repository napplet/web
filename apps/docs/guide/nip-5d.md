# NIP-5D explained

[NIP-5D — *Nostr Web Applets*](#source-of-truth) is the specification that
defines how a napplet and its host shell talk to each other. This page summarizes
the model the `@napplet/*` packages implement.

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
| **dTag** | The napplet type identifier from its NIP-5A manifest. |
| **Aggregate hash** | A SHA-256 over the napplet's build files; identifies an exact build. |
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

The `type` prefix before the first `.` is the **domain**, and routes the message
to the correct NAP handler. **Unrecognized message types are silently ignored**
for forward compatibility — a napplet can speak to an older shell and degrade
gracefully.

## Identity

- The shell assigns a napplet's identity **at iframe creation time**, with no
  negotiation or handshake.
- It maps the iframe's `Window` reference to the napplet's `(dTag, aggregateHash)`
  tuple, read from the NIP-5A manifest.
- The shell MUST verify `MessageEvent.source` on **every** inbound message.
  `MessageEvent.source` is an **unforgeable** sender identity — origin validation
  uses `source`, not `event.origin`.
- Messages from unmapped `Window` references are silently dropped.

## Manifest and NAP negotiation

- A napplet's manifest is a NIP-5D **kind 35129** named-napplet event (adopting
  the NIP-5A `path` + aggregate `x` tag schema). It declares the capabilities it
  needs with `requires` tags: `["requires", "<nap-name>"]`.
- The shell checks those `requires` tags against its own capabilities at load
  time and can warn on a mismatch.
- At runtime, a napplet detects support from domain object presence:
  `if (window.napplet?.relay) { ... }`.
- Napplets MUST **gracefully degrade** when a capability is absent.

The [`@napplet/vite-plugin`](/packages/vite-plugin) generates this manifest at
build time — computing per-file SHA-256 hashes, the aggregate hash, and the
`requires` / `connect` / `config` tags.

## NAP extension framework

- A NAP spec defines a message **domain**, the valid `type` strings within it,
  the payload shapes, and the expected shell behavior.
- A NAP named `foo` owns **all** `foo.*` message types.
- Each NAP must be **independently implementable**, and shells may support any
  subset of NAPs.

This is what makes the protocol modular: NAP contracts live in the
[NAPs track](https://github.com/napplet/naps); see the
[NAP domain reference](/naps/) for the domains this SDK ships.

## Convention URI projection

The stable convention identity is the complete queryless
`napplet:<archetype>/<intent>` string. Archetype manifest tags, subscriptions,
handler discovery, normalized messages, and routing contain that identity and
use exact equality. Optional same-tag `kind:<number>` fields describe one
handler contract; payload content never determines an event kind.

The web binding normalizes developer-facing URI input before `postMessage` for
the two operations that accept it: INC `emit(topic, payload?)` and intent
`invoke/open(uri, options?)`. Unique percent-decoded query pairs become text
payload fields, literal `+` remains `+`, and the outgoing topic or convention is
queryless. Fragments, malformed percent encoding, repeated decoded names, and a
query combined with explicit payload reject. Structured/non-text data uses a
queryless URI with an explicit payload.

NAP-INTENT returns an immediate result whose ordinary wire `id` correlates only
the invocation request and result. `ok: true` means the runtime accepted
delivery responsibility, not that a target received or handled anything. The
later target-only `intent.deliver` push has no request, intent, or delivery ID.
It is carrier-neutral and has no public NAP-INC dependency.

At this web projection's trust boundary, the host authenticates the source
iframe with `MessageEvent.source` and derives the NAP-level `sender` from that
endpoint. A napplet does not provide sender. On other carriers the endpoint
mechanism differs, while the runtime-attested sender contract stays the same.
Receivers treat sender as provenance and payload as untrusted.

This is non-normative guidance following the exact draft heads of [NAP-INC PR
#89
(`4593ce9`)](https://github.com/napplet/naps/pull/89/commits/4593ce9e301ce098fd3dad64206fcd6f144fa7af),
[the governance/web projection PR #90
(`896c32c`)](https://github.com/napplet/naps/pull/90/commits/896c32c92deee68dc4d10fc1132b62df20cccb6f),
and [NAP-INTENT PR #91
(`a718915`)](https://github.com/napplet/naps/pull/91/commits/a718915ddefa2f03a0126579601f59d8bd86f7c4).

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

For every normative requirement, read those — not this page. See
[NIP-5D spec status](/spec) for how drift is tracked.
