---
name: design-napplet
description: Use FIRST when planning a napplet (sandboxed Nostr iframe app), before writing code — turns an app idea into a concrete build spec: which NAP capabilities it needs, which services it requires, the sandbox/CSP constraints that shape it, and a responsive layout that survives any viewport from full-screen to a tiny widget.
---

# Designing a Napplet

Run this before `build-napplet`. Output a short spec the build step executes against. Do not write app code here.

## What a napplet is

A napplet is a single self-contained `/index.html` loaded by a host **shell** into an iframe with `sandbox="allow-scripts"` (no `allow-same-origin`, opaque origin). It talks to the shell over `postMessage` using the NIP-5D JSON envelope. The shell owns identity, signing, relays, storage, and network. The napplet owns UI and logic only. Protocol is defined by canonical NIP-5D (<https://github.com/nostr-protocol/nips/pull/2303>) and the NAPs track (<https://github.com/napplet/naps>) — never invent surface; if you need something undefined, flag it.

## Constraints that drive every design decision

- **No ambient network.** `fetch`, `XMLHttpRequest`, `WebSocket`, `<img src=https://…>`, `<link href=https://…>` are CSP/sandbox-blocked. All external bytes flow through `resource.bytes(url)`. Design around request/await, not direct loads.
- **No direct persistence.** `localStorage`/`IndexedDB`/cookies throw or are inert. State goes through `storage` (512 KB quota, async).
- **No keys.** The napplet never signs. It hands templates to the shell. Never plan a flow that needs a raw privkey.
- **Single file.** Ships as one `index.html` (JS inline, assets folded in). No runtime code-splitting, no external `<script src>`. Keep the bundle lean.
- **Read-only identity.** You can read the user's pubkey/profile/follows; you cannot decrypt or impersonate.

## Step 1 — Pick capabilities (NAPs)

Map each feature to the NAP domain that provides it. Use only domains the shell exposes; gate optional behavior with injected domain property presence.

| Need | NAP domain |
| --- | --- |
| Read/publish Nostr events | `relay` |
| User pubkey / profile / follows / lists | `identity` (read-only) |
| Persist app state | `storage` |
| Talk to other napplets | `inc` |
| Fetch avatars / external bytes | `resource` |
| User-configurable settings | `config` |
| Match shell light/dark/accent | `theme` |
| Keybindings | `keys` |
| Playback / now-playing | `media` |
| Notifications + badge | `notify` |

Other domains exist (`cvm`, `outbox`, `upload`, `intent`) — consult NIP-5D / NAPs before relying on them. Every NAP is **voluntary**: assume a domain may be absent and degrade gracefully.

## Step 2 — Declare requirements vs. optional

- **Hard requirement** → list in the vite-plugin `requires: [...]` (service deps) so a shell can refuse/inform up front.
- **Optional enhancement** → no manifest entry; guard at runtime with `if (window.napplet?.domain)` and provide a fallback.

State which is which in the spec. Prefer optional + graceful degradation over hard requirements.

## Step 3 — Responsiveness is mandatory

A shell may render a napplet at **any** size — full-screen tab, half-pane, sidebar, or a tiny embedded widget — and resize it live. Design fluid, not fixed:

- Use container-relative units, flexbox/grid, `clamp()`, and (where helpful) container queries. Never assume a viewport width.
- Define behavior at the extremes: a usable **tiny** state (compact/iconified, hide non-essential chrome) and a comfortable **large** state.
- Test the smallest size you'll allow and the largest; ensure no horizontal overflow and no clipped controls at either end.
- Honor `theme` so the napplet visually belongs in its host.

## Step 4 — Write the spec

Produce a short block the build step consumes:

```
nappletType: <kebab d-tag, e.g. "note-feed">
purpose: <one line>
NAPs used: relay (req), identity (opt), storage (req), resource (opt)
requires (services): []        # hard service deps, usually empty
config schema: <fields or "none">
layout: <tiny state> / <large state>, responsive strategy
data flow: <subscriptions, publishes, stored keys>
```

Hand this to `build-napplet`. Then verify with `test-napplet`.
