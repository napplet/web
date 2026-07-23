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

- A **shell** — the trusted host application. It brokers signing — to a remote
  signer (NIP-46), a browser extension (NIP-07), or its own key management — plus
  relay access and persistent storage. It hosts napplets in sandboxed iframes and
  brokers their requests.
- Many **napplets** — untrusted, single-purpose mini-apps. A chat widget, a feed
  viewer, a profile editor, a relay manager — each one its own napplet.

The napplet never calls a signer, relay connection, or `localStorage` directly. It
asks the shell, which brokers each request through **NAP** interfaces — keys live
wherever the shell delegates them, not inside the napplet. The browser's iframe
sandbox (`allow-scripts` only, **no** `allow-same-origin`) enforces the boundary,
so a compromised napplet cannot reach the shell's DOM, cookies, or key material.

## NIP-5D in one paragraph

NIP-5D defines the napplet-shell protocol. All messages are JSON objects with a
`type` field in `domain.action` format - `{ type: "outbox.query", ...payload }` -
sent over `postMessage`. The shell assigns each napplet an identity at iframe
creation time by mapping the iframe's unforgeable `MessageEvent.source` to a
`(dTag, aggregateHash)` tuple from the napplet's NIP-5A manifest, so no handshake
is needed. Capability domains (**NAPs** — modular *Nostr Applet Protocol* contracts)
are negotiated declaratively via manifest `requires` tags and queried at runtime
with `window.napplet?.domain`. Read the full
[NIP-5D explanation](./nip-5d).

Archetype roles use stable identities such as `napplet:note/open`. Manifest
discovery, subscriptions, normalized wire identities, and handler routing keep
that complete queryless string and match it exactly. INC `emit` and intent
`invoke/open` are the two developer-facing bindings that may transpose URI
query pairs into a text payload before sending the queryless identity.

Intent invocation reports immediate acceptance or rejection; accepted delivery
arrives later at the target through `onDelivery`, independently of the source
lifetime and without a public INC bridge or delivery identifier. The runtime
attests sender from its authenticated endpoint, while the receiver still treats
payload as untrusted. This project follows the exact draft heads of [NAP-INC PR
#89
(`4593ce9`)](https://github.com/napplet/naps/pull/89/commits/4593ce9e301ce098fd3dad64206fcd6f144fa7af),
[the governance/web projection PR #90
(`896c32c`)](https://github.com/napplet/naps/pull/90/commits/896c32c92deee68dc4d10fc1132b62df20cccb6f),
and [NAP-INTENT PR #91
(`a718915`)](https://github.com/napplet/naps/pull/91/commits/a718915ddefa2f03a0126579601f59d8bd86f7c4).

## A bigger pool of builders

Because the hard, security-sensitive Nostr machinery — relay pools, NIP-46
signers, event signing and encryption — lives behind the shell, a napplet author
doesn't need deep protocol expertise to ship something useful. They render UI and
send envelopes; the shell handles the dangerous parts. That lowers the barrier to
entry and widens the ecosystem **without** putting users at risk.

## Web first, not web only

The napplet model is being proven on the web first, and for good reasons: the
iframe is a real, browser-enforced sandbox you can demonstrate today; the web has
the largest developer ecosystem to draw from; and a napplet is just static files,
so it distributes as a [NIP-5A](https://github.com/nostr-protocol/nips) static
site (an **nsite**) over Nostr + Blossom with no servers.

**NIP-5D is specifically that web realization** — it defines the security posture
and transport (`postMessage` across an `iframe` boundary) for napplets in the
NIP-5A context. It is a web-context spec, not a cross-platform one.

The broader **napplet** and **NAP** capability model, however, is deliberately
transport-agnostic — capability domains and intent, not browser plumbing. The web
is the starting point, not the ceiling: the same model leaves room to be carried on
other platforms later, each of which would define its own transport and security
posture (its own analogue to NIP-5D) rather than reusing the web one.

## Who it's for

- **Nostr developers** who want to ship a focused app without re-building relay
  management, signing, and storage — and without ever holding the user's keys.
- **Developers new to Nostr** who want to build for the ecosystem without mastering
  every protocol detail first — the shell carries that weight.
- **Shell / client authors** who want to host third-party apps safely, competing
  on trust and UX rather than feature count.
- **Protocol tinkerers** exploring what a composable, capability-based Nostr
  client ecosystem looks like.

Ready to build? Head to [Getting Started](./getting-started), or join the
[community group chat](https://armada.buzz/invite/naddr1qvzqqqyzz5pzpjk98hj7z978r9xc9d2ymagw6tga0lx0s06y8lhpy9twc2kp8uwdqqqqpwqpw5#BAACAwTDEKKhS9_iA_qOc1n4ljVt).
