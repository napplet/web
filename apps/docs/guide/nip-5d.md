# NIP-5D explained

[NIP-5D — *Nostr Web Applets*](#authoritative-source) is the specification that
defines how a napplet and its host shell talk to each other. This page summarizes
the model the `@napplet/*` packages implement. For the normative text, always
defer to the authoritative source linked below.

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
| **NUB** | *Napplet Unified Blueprint* — an extension spec defining the protocol messages for a capability domain. |

> In this SDK, a NUB's runtime surface is referred to as a **NAP domain**. Each
> NAP domain owns one message domain (`relay`, `storage`, `identity`, …).

## Transport

- Napplets send messages with `window.parent.postMessage(msg, '*')`; the shell
  replies with `iframeWindow.postMessage(msg, '*')`.
- Napplets MUST be embedded with `sandbox="allow-scripts"` and **without**
  `allow-same-origin`.
- Napplets have **no access** to `localStorage`, `sessionStorage`, `IndexedDB`,
  direct WebSocket connections, or signing keys.
- Shells MUST **not** provide `window.nostr` (NIP-07). Signing and encryption are
  mediated through the relay NAP instead.

## Wire format

Every message is a JSON object with a `type` field in `domain.action` format:

```ts
{ type: "<domain>.<action>", ...payload }
```

Request/response pairs are correlated by an `id` field:

```ts
// request
{ type: "relay.subscribe", id: "abc", subId: "s1", filters: [{ kinds: [1] }] }

// a result arrives back with a matching id (or a related event message)
{ type: "relay.event", subId: "s1", event: { /* NostrEvent */ } }
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

## Manifest and NUB negotiation

- A napplet's manifest is a NIP-5A **kind 35128** event. It declares the
  capabilities it needs with `requires` tags: `["requires", "<nub-name>"]`.
- The shell checks those `requires` tags against its own capabilities at load
  time and can warn on a mismatch.
- At runtime, a napplet queries support with
  `window.napplet.shell.supports('domain')`, which returns a boolean.
- Napplets MUST **gracefully degrade** when a capability is absent.

The [`@napplet/vite-plugin`](/packages/vite-plugin) generates this manifest at
build time — computing per-file SHA-256 hashes, the aggregate hash, and the
`requires` / `connect` / `config` tags.

## NUB extension framework

- A NUB spec defines a message **domain**, the valid `type` strings within it,
  the payload shapes, and the expected shell behavior.
- A NUB named `foo` owns **all** `foo.*` message types.
- Each NUB must be **independently implementable**, and shells may support any
  subset of NUBs.

This is what makes the protocol modular: see the
[NAP domain reference](/naps/) for the domains this SDK ships.

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

## Authoritative source

This page is a summary. The **authoritative** NIP-5D text lives at:

- [`raw.githubusercontent.com/dskvr/nips/.../5D.md`](https://raw.githubusercontent.com/dskvr/nips/d80d7b25f9c4331acbeb40dbeb3b077caa80e885/5D.md)
  (pinned commit `d80d7b25f9c4331acbeb40dbeb3b077caa80e885`)

See [NIP-5D spec status](/spec) for the in-repo reference note and how drift is
tracked.
