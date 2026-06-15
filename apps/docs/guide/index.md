# What are napplets?

A **napplet** is a small, single-purpose Nostr web application that runs inside a
sandboxed iframe and delegates everything sensitive — signing, storage, relay
access — to a host **shell**. The shell and the napplet communicate over
`postMessage` using a JSON envelope wire format defined by
[NIP-5D](./nip-5d).

::: warning ALPHA
napplet is **alpha**. The specification is experimental and a moving target.
There **will most certainly be drift** between the packages and the
specification. Things **will most certainly change**. For adventurers only.
:::

## The monolith problem

Today, every Nostr client re-implements the same machinery from scratch: a feed
viewer, a DM inbox, a profile editor, relay management, key handling, signing.
The result is a handful of large monolithic clients that each duplicate the same
hard, security-sensitive plumbing — and each one is a fresh place for that
plumbing to go wrong.

NIP-5D proposes a different shape:

> Napplets SHOULD be single-purpose rather than monolithic. The shell composes
> multiple napplets; napplets don't compose themselves.

## Shell + napplets

Instead of one client that does everything, you get:

- A **shell** — the trusted host application. It owns the signing keys, the relay
  pool, and persistent storage. It hosts napplets in sandboxed iframes and proxies
  their requests.
- Many **napplets** — untrusted, single-purpose mini-apps. A chat widget, a feed
  viewer, a profile editor, a relay manager — each one its own napplet.

The napplet never touches `localStorage`, relay connections, or signing keys
directly. The shell proxies everything through **NAP** interfaces. The browser's
iframe sandbox (`allow-scripts` only, **no** `allow-same-origin`) enforces the
boundary, so a compromised napplet cannot reach the shell's DOM, cookies, or
keys.

## NIP-5D in one paragraph

NIP-5D defines the napplet-shell protocol. All messages are JSON objects with a
`type` field in `domain.action` format — `{ type: "relay.subscribe", ...payload }` —
sent over `postMessage`. The shell assigns each napplet an identity at iframe
creation time by mapping the iframe's unforgeable `MessageEvent.source` to a
`(dTag, aggregateHash)` tuple from the napplet's NIP-5A manifest, so no handshake
is needed. Capability domains (**NAPs**, built on the **NUB** extension framework)
are negotiated declaratively via manifest `requires` tags and queried at runtime
with `window.napplet.shell.supports('domain')`. Read the full
[NIP-5D explanation](./nip-5d).

## Who it's for

- **Nostr developers** who want to ship a focused app without re-building relay
  management, signing, and storage — and without ever holding the user's keys.
- **Shell / client authors** who want to host third-party apps safely, competing
  on trust and UX rather than feature count.
- **Protocol tinkerers** exploring what a composable, capability-based Nostr
  client ecosystem looks like.

Ready to build? Head to [Getting Started](./getting-started).
