---
name: napplet-make
description: Use when a user asks to create, build, implement, prototype, or port a complete napplet (sandboxed Nostr iframe applet) in one prompt. Entry point that triages the project state and toolchain, then routes through napplet-port (if migrating), napplet-design, napplet-ui, napplet-build (+ napplet-sdk / napplet-interop as needed), and napplet-test, and ends with an evidence report. Keeps social reads and publishes OUTBOX-first and treats NAP-RELAY as an explicit escape hatch only.
---

# Making a Napplet End to End

Top-level workflow for "build me a napplet". Do not jump to code. The goal is a working, conformant, compact, any-size applet whose authority boundaries are right on the first pass.

Protocol truth: NIP-5D (<https://github.com/nostr-protocol/nips/pull/2303>) and the NAPs track (<https://github.com/napplet/naps>). Use only the surface shipped by the installed `@napplet/*` packages. Never invent message types, domains, manifest tags, loading rules, or shell authority to satisfy a prompt; a needed-but-undefined surface is a gap to report.

## Which skills, in which order

| Request | Route |
| --- | --- |
| New napplet from an idea | `napplet-design` → `napplet-ui` → `napplet-build` → `napplet-test` |
| Port an existing Nostr app / client / widget | `napplet-port` → `napplet-design` → `napplet-ui` → `napplet-build` → `napplet-test` |
| Add a feature to an existing napplet | Re-run `napplet-design` for that feature's boundary → `napplet-build` → `napplet-test` |
| Change only layout / visuals | `napplet-ui` → `napplet-test` (four-frame + theme checks) |
| Debug or verify a built napplet | `napplet-test`; edit only after reproducing the failure |
| Needs a NAP / domain the packages do not ship | Stop and flag the gap; do not fake it |

Load `napplet-sdk` while writing calls and `napplet-interop` only if the spec has cross-napplet features.

## Step 1 — Brief

```
d-tag / deployment name:
new build or port:
single-purpose job (one line):
must-have flows:
optional flows:
form factor: compact applet; sizes it must survive; minimum (if any)
target runtime assumptions:
known protocol / package gaps:
```

Split a "whole app" request into focused napplets unless the user explicitly wants one compound napplet that still works in a small frame.

## Step 2 — Triage the directory and toolchain

```bash
pwd
command -v napplet || true
command -v kehto || command -v paja || true
test -f package.json && cat package.json
test -f .napplet/config.json && cat .napplet/config.json
test -f vite.config.ts && sed -n '1,120p' vite.config.ts
find . -maxdepth 2 -type f -not -path './node_modules/*' | sort | sed -n '1,120p'
```

| State | Action |
| --- | --- |
| `napplet` CLI unavailable | Tell the user to install the standalone CLI (or use the repo's documented local path). Never pretend `create` / `init` / `paja` ran. |
| Empty directory | `napplet create <dir>`, `cd`, `napplet init`. |
| Fresh boilerplate, no product work | Keep the substrate; run `napplet init` if metadata is absent; implement the product. |
| Initialized napplet (`.napplet/config.json` + generated scripts) | Inspect metadata and scripts; edit product surfaces only. |
| Brownfield app built on the boilerplate | Preserve compatible scripts/config; port only app code; do not re-scaffold. |
| Brownfield app without the boilerplate | `napplet-port` first, then add only the equivalent build / single-file / metadata / conformance wiring; document the retrofit. |

If Kehto/Paja is unavailable, continue build and conformance work and report the missing runtime as an open manual-preview gap. Never present a raw Vite URL as a napplet preview.

## Step 3 — Non-negotiables while executing

- **Sandbox authority.** No `fetch`, XHR, WebSocket, browser storage, cookies, `window.nostr`, external scripts/styles/images, relay pools, or signing in napplet code. Bytes → bundled or `resource`; state → `storage`; Nostr → `outbox` / `common` / `lists` / `count` / `dm`; links → `link`; `relay` only for a named relay-local escape hatch recorded in the brief.
- **Applet, not website.** No title header / tagline; compact density; fills the frame; good at tiny and huge sizes; declared minimum only when the UI truly breaks (`napplet-ui`).
- **SDK-first.** `@napplet/sdk` wrappers for calls; `window.napplet?.domain` only for optional-domain gating. No `shell.ready()` / `shell.supports()` / service probes — they do not exist.
- **Requires = hard only.** Bare domain names; `keys`, `theme`, `config`, `notify`, `resource`, `inc`, `intent` almost never belong there.
- **Theme covers the whole surface**, including `html` / `body` / root backgrounds, in dark and light.

## Step 4 — Definition of done

"Done" means all of these, with evidence in the final report:

- `pnpm verify` and `pnpm test:conformance` pass in the project (or the retrofit equivalents).
- Boundary audit from `napplet-test` is clean; every `relay` use has a written reason.
- `napplet-ui` four-frame check (`200×160`, `320×560`, `900×600`, largest available) in dark and light: no title header, no overflow, frame filled, minimum notice correct if declared.
- Manifest `requires` matches the spec's hard list; `.napplet/config.json` still owns deployment metadata.
- Paja preview URL reported, or Paja explicitly reported unavailable.
- Any protocol/package gap listed as a gap, not papered over.

Report: changed files, NAP domains used and why, relay escape hatches, frames and themes checked, commands run with results, untested gaps.
