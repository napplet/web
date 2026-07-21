---
name: make-napplet
description: Use when a user asks to create, build, implement, prototype, or port a complete napplet in one prompt. Orchestrates the napplet skills end to end, covers every current package-implemented NAP domain, keeps normal social reads and publishes OUTBOX-first, routes shortcuts/keybindings to NAP-KEYS, and treats NAP-RELAY as an explicit escape hatch only.
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

## Sandbox Authority Contract

Before any design or code, treat the iframe sandbox as a hard boundary:

- Napplet code has no ambient browser authority. Do not use `fetch`,
  `XMLHttpRequest`, `WebSocket`, `localStorage`, `sessionStorage`, IndexedDB,
  cookies, external `<script src>`, external `<link href>`, or external
  `<img src>` in generated napplet code.
- External bytes, including ROMs, WASM side files, avatars, images, audio,
  video, fonts, and JSON, must be either bundled into the single-file artifact
  or requested through `resource.bytes` / `resource.bytesMany`.
- Persistent state goes through `storage`; relay/network behavior goes through
  `outbox`, `common`, `lists`, `count`, `dm`, or an explicit `relay` escape
  hatch; external links go through `link`.
- If a library tries to own browser storage or network internally, either
  configure it onto shell-provided NAPs, stub the forbidden path so it never
  runs, bundle the required bytes at build time, or flag the library as
  unsuitable for a strict napplet. Do not ship a napplet that "mostly works"
  until it hits a browser `NetworkError`.

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
boilerplate substrate:
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
- Keyboard shortcuts/action keybindings use `keys`.
- Playback/now-playing uses `media`; notifications/badges use `notify`.
- Settings/theme use `config` and `theme`.
- Native bridge/device/session features use `cvm`, `ble`, `serial`, or `webrtc`
  only when the user story needs that exact shell-mediated boundary.
- External URL opening uses `link`.
- `relay` is only for an explicit relay-local escape hatch such as group relay
  protocols, diagnostics, or raw relay tooling outside the outbox model.

Record every relay escape hatch in the build brief. If no exact reason exists,
using `relay` is wrong.

## Step 3 - Run The Specialized Skills

1. For ports, run `port-nostr-app` and produce its inventory/handoff.
2. Run `design-napplet` and produce the build spec.
3. For new projects, scaffold with `@napplet/boilerplate` before implementation
   and preserve the generated package manager config, Vite config, scripts,
   layout, README/docs structure, and conformance wiring.
4. Run `build-napplet` against that spec, editing only project-specific files
   such as `src/main.ts`, `src/styles.css`, `vite.config.ts` fields,
   `index.html` title/root markup, config schema, and README/docs.
5. Run `test-napplet` before reporting completion.

Do not claim "done" after design or code alone. Done means the built artifact
passes the boilerplate validation (`pnpm verify`, `pnpm test:conformance`), any
feature-specific checks, and the boundary audit has no forbidden surfaces.

## Step 4 - Package Surface Rule

Use only domains and helpers that are shipped by the current packages. Current
package domains are:

`relay`, `identity`, `storage`, `inc`, `theme`, `keys`, `media`, `notify`,
`config`, `resource`, `cvm`, `outbox`, `upload`, `intent`, `ble`, `webrtc`,
`link`, `count`, `lists`, `serial`, `common`, `dm`.

The deprecated `ifc` subpath is only an INC compatibility alias; new work uses
`inc`. If a NAP is not in the package-domain list above, do not implement
against it as usable API. Use an existing shipped boundary only when it
faithfully models the task, otherwise flag the missing package/spec surface.

Implementation code is SDK-first: import callable helpers from `@napplet/sdk`
when they exist. Use direct `window.napplet?.domain` access for post-injection
optional-domain fallback checks, not as the default way to call NAP methods. If
a current package domain lacks a central SDK namespace/object, use the helper
exports that `@napplet/sdk` re-exports (for example `themeGet` /
`themeOnChanged`) or flag the package gap instead of inventing a local client.

Current packages do not expose `window.napplet.shell`, `shell.ready()`, or
`shell.supports(...)`. Use `@napplet/sdk` wrappers for calls and use
`window.napplet?.domain` only as an optional-domain fallback check after runtime
injection. Do not add a private readiness handshake or generic service probing
layer to generated napplet code.

## Step 5 - Completion Checklist

- No `window.nostr`, private keys, app-owned signing/encryption, relay pools,
  direct NIP-65 routing, `localStorage`, direct `fetch`, external scripts, or
  WebSockets in napplet code.
- No `shell.ready()`, `shell.supports(...)`, `discoverServices`, or generic
  service probing. Current packages expose no `window.napplet.shell` namespace.
  Optional-domain fallback checks are `window.napplet?.domain` after runtime
  injection.
- Napplet implementation calls use `@napplet/sdk` helpers wherever available;
  direct `window.napplet.<domain>.*` calls appear only for true SDK gaps.
- Outbox calls use current option fields only:
  `outbox.getEvent`: `author`, `relays`, `timeoutMs`;
  `outbox.query` / `outbox.subscribe`: `authors`, `relays`, `limit`, `timeoutMs`;
  `outbox.publish`: `relays`, `toOutbox`, `toInboxes`.
  No `strategy`, subscribe `live`, publish `timeoutMs`, or `outbox.eose`.
- Every optional NAP is gated with a graceful fallback.
- Every hard requirement is declared with a bare domain name in the manifest
  `requires` list, not `NAP-*`.
- Do not add `keys` to `requires` when local buttons, menus, text input, or
  click/tap controls let the napplet function without shell-managed key
  reservation.
- Shortcut/keybind features use `keys.register()` / `keys.onAction()` rather
  than app-owned global shortcut plumbing.
- The final answer includes the commands/checks that passed and any live-shell
  interoperability gap that was not tested.

Stop only when the napplet is implemented, verified, and does not own authority
that belongs to the shell.
