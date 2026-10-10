> napplet is **alpha**. The specification is experimental and a moving target. There **will most certainly be drift** between packages and the specification. Things **will most certainly change**. **For adventurers only.**

# napplet

[![CI](https://github.com/napplet/napplet/actions/workflows/ci.yml/badge.svg)](https://github.com/napplet/napplet/actions/workflows/ci.yml)
[![AI Slop Score](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fnapplet%2Fweb%2Fbadges%2Faislop-score.json)](https://github.com/napplet/web/actions/workflows/ai-slop.yml)
[![Publish](https://github.com/napplet/napplet/actions/workflows/publish.yml/badge.svg)](https://github.com/napplet/napplet/actions/workflows/publish.yml)
[![Publish to JSR](https://github.com/napplet/napplet/actions/workflows/publish-jsr.yml/badge.svg)](https://github.com/napplet/napplet/actions/workflows/publish-jsr.yml)

Monorepo for the **napplet** SDK -- libraries for building NIP-5D Nostr Web Applets - "napplets"

A **napplet** is a sandboxed web app that runs inside a **shell**. The shell and napplet communicate over `postMessage` using a JSON envelope format (`{ type, ...payload }`) defined by NIP-5D. The napplet never touches `localStorage`, relay connections, or signing keys directly -- the shell proxies everything through NAP interfaces. [Read about napplets in NIP-5D possiblity](https://github.com/nostr-protocol/nips/pull/2303/changes)

## Build a napplet

Install the standalone CLI; Deno is not required:

```bash
# macOS or Linux
curl -fsSL https://napplet.run/install.sh | sh

# Windows PowerShell
irm https://napplet.run/install.ps1 | iex
```

Run `napplet --version` (also `-v` or `version`) to identify the installed CLI. Run `napplet guide` for the current workflow and links to the relevant docs, or follow the same path directly:

```bash
napplet create my-napplet
cd my-napplet
napplet init
npx skills add napplet/napplet     # agent skills via skills.sh (Claude Code, Codex, Cursor, …)
pnpm install
# Ask your agent to build the napplet, then verify and preview it.
pnpm verify
napplet deploy --dry-run
napplet deploy
```

`napplet create` clones the maintained Vite + TypeScript starter. `napplet init` owns deployment name, title, description, archetype roles and conventions, relays, and Blossom servers in `.napplet/config.json`. Node.js 20+ is needed by the generated project, by the package-backed `create` command, and by the skills.sh CLI.

The CLI supports `napplet screenshot <preview-url> --output preview.png` and optional `napplet deploy --zapstore` application metadata publishing. Use `napplet deploy --zapstore --screenshot <preview-url>` to capture and publish in one invocation. See the [CLI guide](packages/cli/README.md#screenshots-and-optional-zapstore-metadata) for configuration, browser setup, and dry-run examples.

## Event schema compatibility

Current event defaults begin at **CLI 0.7.0**, **Vite plugin 0.15.0**, **conformance 0.18.0**, and **conformance-cli 0.3.0**. Earlier release series use legacy path/aggregate manifests. The event kinds remain 5129/15129/35129; current events use the artifact SHA-256 in `x`, a description in `content`, and `R`/`O` plus `z`/`i` metadata. CLI deployments offer temporary `--format legacy` support; unattended deployments default to current. See the [migration guide](apps/docs/guide/event-migration.md) for event conversion, legacy pointers and shell storage/ACL implications.

## Packages

| Package | npm | JSR | Description |
|---------|-----|-----|-------------|
| [@napplet/core](packages/core) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fcore?label=npm)](https://www.npmjs.com/package/@napplet/core) | [![JSR](https://jsr.io/badges/@napplet/core)](https://jsr.io/@napplet/core) | JSON envelope types (`NappletMessage`, `NapDomain`), NAP dispatch infrastructure (`registerNap`, `dispatch`), protocol constants and Nostr types. Imported by all other packages. |
| [@napplet/shim](packages/shim) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fshim?label=npm)](https://www.npmjs.com/package/@napplet/shim) | [![JSR](https://jsr.io/badges/@napplet/shim)](https://jsr.io/@napplet/shim) | Runtime-side helper for injecting selected `window.napplet.<domain>` objects before napplet code runs. Sends JSON envelope messages via postMessage. |
| [@napplet/sdk](packages/sdk) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fsdk?label=npm)](https://www.npmjs.com/package/@napplet/sdk) | [![JSR](https://jsr.io/badges/@napplet/sdk)](https://jsr.io/@napplet/sdk) | Named TypeScript exports wrapping `window.napplet` for bundler consumers. Provides domain wrapper objects and NAP message type re-exports, including `relay`, `inc`, `storage`, `cvm`, `outbox`, `upload`, `intent`, `ble`, `webrtc`, `link`, `count`, `lists`, `common`, `serial`, `fs`, and `dm`. |
| [@napplet/nap](packages/nap) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fnap?label=npm)](https://www.npmjs.com/package/@napplet/nap) | [![JSR](https://jsr.io/badges/@napplet/nap)](https://jsr.io/@napplet/nap) | Compatibility package for active NAP domain subpaths (shell, relay, storage, inc, ifc, keys, theme, media, notify, identity, config, resource, cvm, outbox, upload, intent, ble, webrtc, link, count, lists, common, serial, fs, dm) with barrel + granular (types/shim/sdk) exports. Tree-shakable (`sideEffects: false`). Includes ownership-aware `media` and `resource`, the ContextVM `cvm` bridge with registry helpers, outbox-aware `outbox` relay routing, shell-mediated `upload`, archetype `intent` dispatch, runtime-mediated BLE/WebRTC, link opening, event counts, list mutations, common social actions, serial device access, shell-mediated virtual filesystem access, direct messages, and read-only `identity` helpers. See [packages/nap/README.md](packages/nap/README.md) for the full subpath reference. |
| [@napplet/vite-plugin](packages/vite-plugin) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fvite-plugin?label=npm)](https://www.npmjs.com/package/@napplet/vite-plugin) | [![JSR](https://jsr.io/badges/@napplet/vite-plugin)](https://jsr.io/@napplet/vite-plugin) | Vite plugin for current NIP-5D manifests: hashes the final index.html artifact, emits description content and capability/intent metadata, and defaults to single-file output. |
| [@napplet/cli](packages/cli) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fcli?label=npm)](https://www.npmjs.com/package/@napplet/cli) | [![JSR](https://jsr.io/badges/@napplet/cli)](https://jsr.io/@napplet/cli) | Standalone CLI for creating projects, owning deploy metadata, discovering builds, and deploying signed manifests. JSR/Deno remains an alternative install route. |
| [@napplet/boilerplate](packages/boilerplate) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fboilerplate?label=npm)](https://www.npmjs.com/package/@napplet/boilerplate) | — | Project-only generator behind `napplet create`; clones the maintained Vite + TypeScript starter and derives its package name without setting deployment metadata. |
| [@napplet/conformance](packages/conformance) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fconformance?label=npm)](https://www.npmjs.com/package/@napplet/conformance) | [![JSR](https://jsr.io/badges/@napplet/conformance)](https://jsr.io/@napplet/conformance) | Framework-agnostic conformance engine: hand-written envelope validators for the active NAP wire domains, a signed manifest-event validator, a scriptable reference mock shell, the zero-config check catalog, and pretty/JSON/JUnit reporters. Browser-safe; reused by both the CLI and the web runtime. |
| [@napplet/conformance-cli](packages/conformance-cli) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fconformance-cli?label=npm)](https://www.npmjs.com/package/@napplet/conformance-cli) | — | Headless `napplet-conformance` runner. Drives the engine against a napplet in real Chromium (Playwright) and sets a CI exit code — wire it up as `test:conformance`. npm-only (Playwright dependency). |
| [@napplet/conformance-web](apps/conformance) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fconformance-web?label=npm)](https://www.npmjs.com/package/@napplet/conformance-web) | — | Browser conformance runtime deployed at `/conformance` and bundled into `napplet-conformance --ui`. Runs the conformance engine live in the page with a check tree, envelope log, and manifest inspector. |

## Conformance testing

Napplets can verify they conform to the NAP protocol **before** publishing, in two scopes that share one engine:

```bash
# Headless / CI — exits non-zero on any error-severity failure:
npx napplet-conformance ./dist
```

```bash
# App variant — opens the live web runtime and re-runs on every change (like vitest --ui):
npx napplet-conformance --ui . --exec "vite build --watch"
```

```jsonc
// package.json — works with pnpm / npm / yarn / bun:
{
  "scripts": {
    "test:conformance": "napplet-conformance ./dist",
    "test:conformance:ui": "napplet-conformance --ui . --exec \"vite build --watch\""
  }
}
```

The same web runtime ships standalone (`apps/conformance`, deployed at `/conformance`) and runs the checks live in the browser with a visual report. v1 is zero-config protocol conformance: signed manifest-event validity, boots under `sandbox="allow-scripts"`, receives a runtime-injected `window.napplet`, every emitted envelope is well-formed, graceful degradation when a domain is absent, and no forbidden globals.

## Changelog

- **Conformance tooling** — new `@napplet/conformance` engine + `@napplet/conformance-cli` runner + standalone `apps/conformance` web runtime let a napplet self-verify NAP protocol conformance headlessly (CI) and live in the browser. Hand-written per-NAP envelope validators (drift-guarded against `@napplet/nap`), manifest checks, a reference mock shell, and a `test:conformance`-ready CLI.
- **v0.32.0 — Read-Only NAP-IDENTITY** — `identity.getPublicKey()` is a snapshot that resolves to a hex pubkey or `""` when no user is connected, and `identity.onChanged(handler)` receives shell-pushed `identity.changed` updates. Identity no longer exposes decrypt, encrypt, or signing operations.
## Architecture

### Package Dependency Graph

```
@napplet/shim ──► @napplet/nap ──► @napplet/core
@napplet/sdk  ──► @napplet/core

@napplet/vite-plugin  (build-time only, depends on nostr-tools)
@napplet/cli          (Deno deploy and diagnostics tool)

@napplet/boilerplate  (CLI generator, clones github.com/napplet/boilerplate)
@napplet/conformance-cli ──► @napplet/conformance + @napplet/conformance-web
@napplet/conformance-web ──► @napplet/conformance
```

### Runtime Injection And Napplet-Side Communication

```
Shell runtime                              @napplet/shim
  ShellBridge                                window.napplet.outbox (query/subscribe/publish)
  ├── JSON envelope message routing          window.napplet.inc   (topics/channels)
  ├── Identity via message.source            window.napplet.storage (get/set/remove)
  ├── ACL enforcement                        window.napplet.resource (bytes/bytesMany/bytesAsObjectURL)
  ├── NAP dispatch (outbox/relay/storage)    window.napplet.domain presence
  └── INC routing

◄────────── postMessage: { type: 'outbox.subscribe', id, filters } ─────────►
◄────────── postMessage: { type: 'outbox.event', subId, result }   ─────────►

@napplet/vite-plugin (build time)
  └── NIP-5D manifest generation + R/O capability advertisements
```

The iframe uses `sandbox="allow-scripts"`, without `allow-same-origin`, as specified by [NIP-5D Transport](https://github.com/dskvr/nips/blob/nip/5d/5D.md#transport). Napplets cannot access the host shell's DOM, cookies, localStorage, or service workers. All persistent state goes through the shell's proxies.

### Intent dispatch

NAP-INTENT accepts convention URIs through `invoke(uri, options?)` and `open(uri, options?)`. The binding derives the role, action, and stable convention identity before dispatch.

```ts
const result = await window.napplet.intent?.open('napplet:profile/open', {
  payload: { pubkey: 'abc123' },
  behavior: { focus: true, reuse: false },
});
if (!result?.ok) throw new Error(result?.error ?? 'intent not accepted');
window.napplet.intent?.onDelivery(({ sender, convention, payload }) => {
  console.log(sender, convention, payload);
});
```

Acceptance transfers delivery responsibility to the runtime; target delivery is retained until `onDelivery` registration and does not depend on the source remaining alive. Candidates expose opaque catalog identifiers and manifest-derived parameter contracts. NAP-SHELL provides optional environment information without gating other domains. This non-normative orientation defers to the living [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md) and [NAP-SHELL](https://github.com/napplet/naps/blob/master/naps/NAP-SHELL.md).

## Origin

The napplet protocol is defined by the living [NIP-5D specification](https://github.com/nostr-protocol/nips/pull/2303); the NAP capability domains are defined on the [NAPs track](https://github.com/napplet/naps). Any shell can host napplets by injecting `window.napplet` before napplet scripts run. Napplet application code consumes injected domains directly or through `@napplet/sdk`.

## Development

```bash
pnpm install
pnpm build        # Build all packages via turborepo
pnpm type-check   # TypeScript validation
napplet create my-napplet # Scaffold a new napplet from the template repo
```

### Publishing

Publishing runs from GitHub Actions. Prepare release metadata locally, then push the branch/tag and let the npm + JSR workflows publish from `main`.

```bash
pnpm version-packages   # Apply changesets, bump versions
```

## Website

The informational site and package documentation live in `apps/`:

- `apps/web` -- Svelte + Vite marketing/education SPA explaining NIP-5D and the paradigm.
- `apps/docs` -- VitePress documentation, served under `/docs`.
- `apps/conformance` -- the standalone conformance web runtime, served under `/conformance`.

```bash
pnpm --filter @napplet/web dev             # marketing SPA
pnpm --filter @napplet/docs dev            # documentation
pnpm --filter @napplet/conformance-web dev # conformance runtime
```

`.github/workflows/deploy-site.yml` builds all three, stitches docs under `/docs` and the conformance runtime under `/conformance`, and deploys to Bunny + nsite. Configure deploy secrets with `scripts/setup-site-secrets.sh`.

## Related

- **[NIP-5D](https://github.com/nostr-protocol/nips/pull/2303)** -- the living napplet-shell protocol specification (source of truth)
- **[NAPs track](https://github.com/napplet/naps)** -- where every NAP capability domain is proposed and defined

## License

MIT
