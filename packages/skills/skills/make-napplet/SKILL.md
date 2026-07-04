---
name: make-napplet
description: Use when a user asks to create, build, implement, prototype, or port a complete napplet in one prompt. Orchestrates the napplet skills end to end by running port-nostr-app when starting from an existing Nostr app, design-napplet before code, build-napplet for implementation, and test-napplet before claiming done. Keeps normal social reads and publishes OUTBOX-first and treats NAP-RELAY as an explicit escape hatch only.
---

# Making A Napplet End To End

Use this as the top-level workflow for "build me a napplet" prompts. Do not skip
straight to code. The goal is a working, conformant napplet with the right shell
boundaries on the first implementation pass.

Protocol truth: NIP-5D (<https://github.com/nostr-protocol/nips/pull/2303>) and
the NAPs track (<https://github.com/napplet/naps>). Use the current
`@napplet/*` package surface in this repo or the installed package version.
Never invent message types, domains, manifest tags, loading rules, or shell
authority to satisfy a prompt.

## Decision Tree

| User request | First step |
| --- | --- |
| New napplet from an idea | Run `design-napplet`, then `build-napplet`, then `test-napplet` |
| Port an existing Nostr app/client/widget | Run `port-nostr-app`, then `design-napplet`, then `build-napplet`, then `test-napplet` |
| Add a feature to an existing napplet | Re-run the relevant part of `design-napplet` for the feature boundary, then build and test |
| Debug or verify a built napplet | Run `test-napplet`; only edit after reproducing the failure |
| Request needs a NAP/domain not shipped by current packages | Stop and flag the gap; do not fake it with local APIs |

## Step 1 - Establish Scope

Write a small build brief before editing:

```
nappletType:
new build or port:
single-purpose job:
must-have user flows:
optional user flows:
target shell assumptions:
known protocol/package gaps:
```

If the request is a full app, split it into focused napplets unless the user
explicitly requires one compound napplet and that shape is still usable in a
small iframe.

## Step 2 - Pick The Boundary Before Code

Default social/event boundary:

- Feeds, timelines, profiles, event lookups, search-ish reads, and normal
  publishes use `outbox`.
- Follow/unfollow/react/report/profile lookup/NIP-19 use `common`.
- NIP-51/NIP-65 list mutation uses `lists`.
- Counts use `count`.
- Direct messages use `dm`.
- User pubkey/current-user snapshots use `identity`.
- Local app state uses `storage`.
- External bytes use `resource`; uploads use `upload`.
- Cross-napplet handoff uses `inc` or `intent`.
- `relay` is only for an explicit relay-local escape hatch such as group relay
  protocols, diagnostics, or raw relay tooling outside the outbox model.

Record every relay escape hatch in the build brief. If no exact reason exists,
using `relay` is wrong.

## Step 3 - Run The Specialized Skills

1. For ports, run `port-nostr-app` and produce its inventory/handoff.
2. Run `design-napplet` and produce the build spec.
3. Run `build-napplet` against that spec.
4. Run `test-napplet` before reporting completion.

Do not claim "done" after design or code alone. Done means the built artifact
passes the relevant conformance/build/test checks and the boundary audit has no
forbidden surfaces.

## Step 4 - Package Surface Rule

Use only domains and helpers that are shipped by the current packages. Current
package domains are:

`relay`, `identity`, `storage`, `inc`, `theme`, `keys`, `media`, `notify`,
`config`, `resource`, `cvm`, `outbox`, `upload`, `intent`, `ble`, `webrtc`,
`link`, `count`, `lists`, `serial`, `common`, `dm`.

Open NAP proposals such as Blossom, hashtree, torrent, proof-of-work, system, or
value are not package surfaces until the current packages export matching
domains. If a user story needs one, use an existing shipped boundary when it
faithfully models the task (`resource`, `upload`, `link`, `intent`, etc.) or
flag the missing package/spec surface.

## Step 5 - Completion Checklist

- No `window.nostr`, private keys, app-owned signing/encryption, relay pools,
  direct NIP-65 routing, `localStorage`, direct `fetch`, external scripts, or
  WebSockets in napplet code.
- No `shell.supports`, `shell.ready`, `discoverServices`, or generic service
  probing. Domain availability is `window.napplet?.domain`.
- `outbox.query` / `outbox.subscribe` / `outbox.publish` use current option
  fields only: `authors`, `author`, `relays`, `targetAuthors`, `limit`,
  `timeoutMs`. No `strategy`, subscribe `live`, or `outbox.eose`.
- Every optional NAP is gated with a graceful fallback.
- Every hard requirement is declared with a bare domain name in the manifest
  `requires` list, not `NAP-*`.
- The final answer includes the commands/checks that passed and any live-shell
  interoperability gap that was not tested.

Stop only when the napplet is implemented, verified, and does not own authority
that belongs to the shell.
