---
name: design-napplet
description: Use FIRST when planning a napplet (sandboxed Nostr iframe app), before writing code - turns an app idea into a concrete build spec covering required NAP capabilities, shell services, sandbox/CSP constraints, OUTBOX-first event routing, and a responsive layout that survives any viewport from full-screen to a tiny widget.
---

# Designing a Napplet

Run this before `build-napplet`. Output a short spec the build step executes against. Do not write app code here. If the task is porting an existing Nostr app, run `port-nostr-app` first to identify the boundaries that must be replaced.

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
| Read/publish Nostr events where relay choice affects correctness | `outbox` |
| Low-level relay access to one explicit relay, relay diagnostics, or protocols outside the outbox model | `relay` |
| Common public social actions: profile lookup, follows, follow/unfollow, reactions, reports, NIP-19 helpers | `common` |
| Safe NIP-51 / NIP-65 list mutations | `lists` |
| Counts for reactions, replies, reposts, quotes, reports, followers | `count` |
| Direct-message UI and message send/history/live delivery | `dm` |
| User pubkey / public identity snapshots | `identity` (read-only) |
| Persist app state | `storage` |
| Talk to other napplets | `inc` |
| Fetch avatars / external bytes | `resource` |
| User-configurable settings | `config` |
| Match shell light/dark/accent | `theme` |
| Keybindings | `keys` |
| Playback / now-playing | `media` |
| Notifications + badge | `notify` |

Other domains exist (`cvm`, `upload`, `intent`, `ble`, `webrtc`, `link`, `serial`) - consult NIP-5D / NAPs before relying on them. Every NAP is **voluntary**: assume a domain may be absent and degrade gracefully.

## Step 1.5 — Choose The Right Nostr Boundary

Default to the highest-level NAP that owns the user intent:

| Feature shape | Prefer | Do not start with |
| --- | --- | --- |
| Timeline/feed/profile/event reads that should follow author relay lists | `outbox.query` / `outbox.subscribe` | Manual `relay.subscribe` plus app-owned relay discovery |
| Publishing user-authored public events | `outbox.publish` | `relay.publish` unless the outbox model is wrong for the feature |
| Follow/unfollow/react/report/profile lookup/NIP-19 helpers | `common` | Hand-built events plus relay publish |
| Mute/pin/bookmark/follow-set/relay-list mutation | `lists` | Editing replacement list events locally |
| Counts or badges where event bodies are not needed | `count.query` | Downloading matching events through relay/outbox |
| Direct-message products | `dm` | Implementing NIP-04/NIP-17/NDR crypto and relay routing inside the napplet |
| One explicit relay, group relay, raw relay diagnostics, or a protocol not expressible through outbox/common/lists/count/dm | `relay` | Treating relay as the default app data layer |

Use `relay` as an escape hatch only when the feature genuinely needs relay-local semantics. If the app is social, publishing user events, reading authors' events, or mutating user-owned Nostr state, it is almost always `outbox`, `common`, `lists`, `count`, or `dm`.

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
NAPs used: outbox (req), common (opt), identity (opt), storage (req), resource (opt)
requires (services): []        # hard service deps, usually empty
config schema: <fields or "none">
layout: <tiny state> / <large state>, responsive strategy
data flow: <outbox queries/subscriptions/publishes, social actions, stored keys>
relay escape hatches: <none, or exact reason + why outbox/common/lists/count/dm do not apply>
```

Hand this to `build-napplet`. Then verify with `test-napplet`.
