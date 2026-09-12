---
name: napplet-design
description: Use FIRST when planning a napplet (sandboxed Nostr iframe applet), before any code - turns an idea into a short build spec - the sandbox authority contract, which shipped NAP domains own each feature (OUTBOX-first, relay as escape hatch), hard requires vs optional fallbacks, the form-factor plan (compact applet, any size from widget to full screen, declared minimum only if the UI truly breaks), theme, and data flow. Output is consumed by napplet-build.
---

# Designing a Napplet

Run this before `napplet-build`. Output the spec block at the end; do not write app code here. If the starting point is an existing Nostr app, run `napplet-port` first. Protocol truth is canonical NIP-5D (<https://github.com/nostr-protocol/nips/pull/2303>) and the NAPs track (<https://github.com/napplet/naps>) — never invent surface; flag gaps.

## What a napplet is

A single self-contained `/index.html` that a host **runtime** (shell) loads into an iframe with `sandbox="allow-scripts"` (no `allow-same-origin`, opaque origin) and talks to over `postMessage` using the NIP-5D JSON envelope. The shell owns identity, signing, relays, storage, network, and the window chrome (it shows the napplet's name). The napplet owns UI and logic only. It is an **applet**: small, focused software that may be placed at any size — see `napplet-ui`.

## Sandbox authority contract

Design as if direct browser authority does not exist. A valid spec names the NAP boundary for every capability:

- External bytes (images, avatars, media, fonts, JSON, WASM side files) are bundled into the single-file artifact or flow through `resource`.
- Persistence flows through `storage` (async, 512 KB, scoped) — never browser storage, cookies, or a local database.
- Nostr reads and publishes flow through `outbox`, `common`, `lists`, `count`, `dm`, or a named `relay` escape hatch. The napplet never holds keys or signs.
- External navigation flows through `link`; playback sessions through `media` when the shell owns that boundary.
- Single file: JS inline, assets folded in, no runtime code-splitting, no external `<script src>`.

If the design needs `fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`, IndexedDB, cookies, external scripts/styles/images, relay pools, `window.nostr`, or app-owned signing, it is not a napplet yet — redesign around a shipped NAP or flag the missing capability.

## Step 1 — Scope one job

Write the single-purpose job in one line. If the request is a whole app, split it into focused napplets (feed, composer, profile, DMs, settings…) unless the user explicitly wants one compound napplet that still works in a small frame. Cross-napplet handoff uses `inc` / `intent` (`napplet-interop`).

## Step 2 — Map features to shipped NAP domains

Use only domains the current `@napplet/sdk` exports (`napplet-sdk` lists them). Default to the highest-level NAP that owns the user intent:

| Feature shape | Prefer | Do not start with |
| --- | --- | --- |
| Feed / profile / event reads that should follow author relay lists | `outbox.query` / `outbox.subscribe` | Manual `relay.subscribe` + app relay discovery |
| Publishing user-authored events | `outbox.publish` | `relay.publish` |
| Follow / unfollow / react / report / profile lookup / NIP-19 | `common` | Hand-built events + publish |
| Mute / pin / bookmark / follow-set / relay-list mutation | `lists` | Editing replaceable lists locally |
| Counts or badges without event bodies | `count.query` | Downloading events to count them |
| Direct messages | `dm` | Implementing NIP-04/17 crypto and routing |
| Current user pubkey / snapshots | `identity` (read-only) | Polling or `window.nostr` |
| App state | `storage` | `localStorage` |
| Avatars, images, JSON, media bytes | `resource` | `fetch`, `<img src=https://…>` |
| Uploads, external links | `upload`, `link` | Direct network / `window.open` |
| Settings, host look | `config`, `theme` | App-owned settings pages |
| Shortcuts | `keys` | Global key capture |
| Notifications, playback, device bridges | `notify`, `media`, `cvm`, `ble`, `serial`, `fs`, `webrtc` | Browser APIs |
| One explicit relay, diagnostics, protocols outside the outbox model | `relay` | Treating relay as the data layer |

Every NAP is voluntary: assume a domain may be absent and name the fallback. `relay` needs an exact written reason; if none exists it is wrong. There is no `shell.ready()` / `shell.supports()` / capability probe — a conforming runtime installs `window.napplet` before module code runs.

## Step 3 — Hard requirements vs optional enhancements

- **Hard** (napplet cannot do its one job without it) → bare domain names in the vite-plugin `requires: [...]` so a shell can refuse the load up front.
- **Optional** → no manifest entry; gate after injection with `if (window.napplet?.domain)` and give a fallback.

Prefer optional + graceful degradation. `keys`, `theme`, `config`, `notify`, `resource`, `inc`, `intent` are almost never hard.

## Step 4 — Form factor plan (mandatory)

Decide these now; `napplet-ui` has the rules and defaults:

- **No title header.** The runtime shows the name; the spec does not include an app title, tagline, or masthead.
- **Density:** `compact` unless the product is a reader/viewer that justifies larger type — state the deviation.
- **Tier behavior:** what the napplet shows at `tiny (<240px)`, `compact (240–480)`, `regular (480–900)`, `wide (>900)`, and at short heights. The wide tier must *use* the space (more columns/rows/detail), not center a column.
- **Minimum size:** `none` (degrade instead) or exact `minWidth × minHeight` plus why, with the notice text shown below it.
- **Theme:** whole-surface mapping (background/text/primary → html/body/root + tokens), fallback palette, dark and light both checked.
- **States:** inline compact loading / empty / error / signed-out.

## Step 5 — Write the spec

```
nappletType: <kebab d-tag, e.g. "note-feed">
purpose: <one line, one job>
NAPs used: outbox (req), storage (req), identity (opt), common (opt), resource (opt)
requires: [outbox, storage]        # hard only
optional domains and fallbacks: resource -> initials avatar; common -> hide react/follow; keys -> buttons only
SDK helpers: outbox.query, outbox.subscribe, outbox.publish, storage.getItem/setItem, identity.getPublicKey/onChanged
data flow: <queries / subscriptions / publishes / stored keys>
relay escape hatches: none | <exact reason outbox/common/lists/count/dm cannot cover>
config schema: none | <fields>
interop: none | <see napplet-interop lines>
density: compact | <deviation + reason>
tiers: tiny=<…> compact=<…> regular=<…> wide=<…> short-height=<…>
minimum size: none | <W×H + reason + notice text>
theme: optional | required; fallback palette <bg/fg/primary>
states: loading=<…> empty=<…> error=<…> signed-out=<…>
```

Hand this to `napplet-build`; verify with `napplet-test`.
