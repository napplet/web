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

Run `napplet guide` for the current workflow and links to the relevant docs, or
follow the same path directly:

```bash
napplet create my-napplet
cd my-napplet
napplet init
napplet skills install --to codex # claude, cursor, agents, gemini, and others are supported
pnpm install
# Ask your agent to build the napplet, then verify and preview it.
pnpm verify
napplet deploy --dry-run
napplet deploy
```

`napplet create` clones the maintained Vite + TypeScript starter. `napplet init`
owns deployment name, title, description, archetype roles and conventions, relays,
and Blossom servers in `.napplet/config.json`. Node.js 20+ is needed by the
generated project and by the package-backed `create` and `skills` commands.

## Packages

| Package | npm | JSR | Description |
|---------|-----|-----|-------------|
| [@napplet/core](packages/core) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fcore?label=npm)](https://www.npmjs.com/package/@napplet/core) | [![JSR](https://jsr.io/badges/@napplet/core)](https://jsr.io/@napplet/core) | JSON envelope types (`NappletMessage`, `NapDomain`), NAP dispatch infrastructure (`registerNap`, `dispatch`), protocol constants and Nostr types. Imported by all other packages. |
| [@napplet/shim](packages/shim) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fshim?label=npm)](https://www.npmjs.com/package/@napplet/shim) | [![JSR](https://jsr.io/badges/@napplet/shim)](https://jsr.io/@napplet/shim) | Runtime-side helper for injecting selected `window.napplet.<domain>` objects before napplet code runs. Sends JSON envelope messages via postMessage. |
| [@napplet/sdk](packages/sdk) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fsdk?label=npm)](https://www.npmjs.com/package/@napplet/sdk) | [![JSR](https://jsr.io/badges/@napplet/sdk)](https://jsr.io/@napplet/sdk) | Named TypeScript exports wrapping `window.napplet` for bundler consumers. Provides domain wrapper objects and NAP message type re-exports, including `relay`, `inc`, `storage`, `cvm`, `outbox`, `upload`, `intent`, `ble`, `webrtc`, `link`, `count`, `lists`, `common`, `serial`, and `dm`. |
| [@napplet/nap](packages/nap) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fnap?label=npm)](https://www.npmjs.com/package/@napplet/nap) | [![JSR](https://jsr.io/badges/@napplet/nap)](https://jsr.io/@napplet/nap) | Compatibility package for active NAP domain subpaths (relay, storage, inc, ifc, keys, theme, media, notify, identity, config, resource, cvm, outbox, upload, intent, ble, webrtc, link, count, lists, common, serial, dm) with barrel + granular (types/shim/sdk) exports. Tree-shakable (`sideEffects: false`). Includes ownership-aware `media` and `resource`, the ContextVM `cvm` bridge with registry helpers, outbox-aware `outbox` relay routing, shell-mediated `upload`, archetype `intent` dispatch, runtime-mediated BLE/WebRTC, link opening, event counts, list mutations, common social actions, serial device access, direct messages, and read-only `identity` helpers. See [packages/nap/README.md](packages/nap/README.md) for the full subpath reference. |
| [@napplet/vite-plugin](packages/vite-plugin) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fvite-plugin?label=npm)](https://www.npmjs.com/package/@napplet/vite-plugin) | [![JSR](https://jsr.io/badges/@napplet/vite-plugin)](https://jsr.io/@napplet/vite-plugin) | Vite plugin for NIP-5D manifest generation. Computes per-file SHA-256 hashes, signs a kind 35129 napplet manifest event (NIP-5A `path` + aggregate `x` tag schema) at build time, and injects `requires` meta tags. Options: required `nappletType` (the `d` tag), optional bare NAP domain `requires`, an `artifactMode` (`external-assets` default or `single-file`), an optional `configSchema` (NAP-CONFIG), and NAAT archetype role tags. |
| [@napplet/cli](packages/cli) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fcli?label=npm)](https://www.npmjs.com/package/@napplet/cli) | [![JSR](https://jsr.io/badges/@napplet/cli)](https://jsr.io/@napplet/cli) | Standalone CLI for creating projects, owning deploy metadata, installing agent skills, discovering builds, and deploying signed manifests. JSR/Deno remains an alternative install route. |
| [@napplet/boilerplate](packages/boilerplate) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fboilerplate?label=npm)](https://www.npmjs.com/package/@napplet/boilerplate) | — | Project-only generator behind `napplet create`; clones the maintained Vite + TypeScript starter and derives its package name without setting deployment metadata. |
| [@napplet/conformance](packages/conformance) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fconformance?label=npm)](https://www.npmjs.com/package/@napplet/conformance) | [![JSR](https://jsr.io/badges/@napplet/conformance)](https://jsr.io/@napplet/conformance) | Framework-agnostic conformance engine: hand-written envelope validators for the active NAP wire domains, a manifest/meta validator, a scriptable reference mock shell, the zero-config check catalog, and pretty/JSON/JUnit reporters. Browser-safe; reused by both the CLI and the web runtime. |
| [@napplet/conformance-cli](packages/conformance-cli) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fconformance-cli?label=npm)](https://www.npmjs.com/package/@napplet/conformance-cli) | — | Headless `napplet-conformance` runner. Drives the engine against a napplet in real Chromium (Playwright) and sets a CI exit code — wire it up as `test:conformance`. npm-only (Playwright dependency). |
| [@napplet/conformance-web](apps/conformance) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fconformance-web?label=npm)](https://www.npmjs.com/package/@napplet/conformance-web) | — | Browser conformance runtime deployed at `/conformance` and bundled into `napplet-conformance --ui`. Runs the conformance engine live in the page with a check tree, envelope log, and manifest inspector. |
| [@napplet/skills](packages/skills) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fskills?label=npm)](https://www.npmjs.com/package/@napplet/skills) | [![JSR](https://jsr.io/badges/@napplet/skills)](https://jsr.io/@napplet/skills) | Agent skills (`make-napplet`, `design-napplet`, `build-napplet`, `port-nostr-app`, `test-napplet`) installed through `napplet skills` for Claude Code, Codex, Cursor, Windsurf, `AGENTS.md`, Gemini, or Copilot. |

## Conformance testing

Napplets can verify they conform to the NAP protocol **before** publishing, in two
scopes that share one engine:

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

The same web runtime ships standalone (`apps/conformance`, deployed at `/conformance`)
and runs the checks live in the browser with a visual report. v1 is zero-config protocol
conformance: manifest/meta validity, boots under `sandbox="allow-scripts"`, receives
a runtime-injected `window.napplet`, every emitted envelope is well-formed,
graceful degradation when a domain is absent, and no forbidden globals.

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
  ├── JSON envelope message routing          window.napplet.inc   (emit/on)
  ├── Identity via message.source            window.napplet.storage (get/set/remove)
  ├── ACL enforcement                        window.napplet.resource (bytes/bytesMany/bytesAsObjectURL)
  ├── NAP dispatch (outbox/relay/storage)    window.napplet.domain presence
  └── INC routing

◄────────── postMessage: { type: 'outbox.subscribe', id, filters } ─────────►
◄────────── postMessage: { type: 'outbox.event', subId, result }   ─────────►

@napplet/vite-plugin (build time)
  └── NIP-5D manifest generation + requires tag injection
```

The iframe sandbox requires only `allow-scripts` -- **no `allow-same-origin`**. Shells MAY add additional tokens (`allow-forms`, `allow-popups`, etc.) per shell policy. Napplets cannot access the host shell's DOM, cookies, localStorage, or service workers. All persistent state goes through the shell's proxies.

### Intent delivery

NAP-INTENT calls use an authoritative convention URI such as
`napplet:profile/open?pubkey=abc123`. The runtime binding normalizes that URI
at `intent.invoke`/`intent.open` only: it derives the archetype, action,
queryless convention, and shallow text payload before requesting acceptance.
Manifest discovery and INC subscriptions remain queryless/exact; they do not
parse a URI query.

An accepted invocation means the runtime has accepted delivery responsibility,
not that a target has started or received the payload. A target should register
`onDelivery` during startup and validate the payload before using it:

```ts
window.napplet.intent?.onDelivery((delivery) => {
  // `sender` is runtime-attested provenance; `payload` remains untrusted.
  renderProfile(delivery.payload);
});

const result = await window.napplet.intent?.open(
  'napplet:profile/open?pubkey=abc123',
);
if (!result?.ok) throw new Error(result?.error ?? 'intent rejected');
```

The target may already be running or start later; the protocol does not promise
source/target overlap, retries, or persistence. NAP-INTENT has no public
NAP-INC dependency. This repository's adopted draft references are
[NAP-INC #89 at `4593ce9`](https://github.com/napplet/naps/blob/4593ce9e301ce098fd3dad64206fcd6f144fa7af/naps/NAP-INC.md),
[URI terminology #90 at `896c32c`](https://github.com/napplet/naps/commit/896c32c92deee68dc4d10fc1132b62df20cccb6f),
and [NAP-INTENT #91 at `a718915`](https://github.com/napplet/naps/blob/a718915ddefa2f03a0126579601f59d8bd86f7c4/naps/NAP-INTENT.md).

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

Publishing runs from GitHub Actions. Prepare release metadata locally, then push
the branch/tag and let the npm + JSR workflows publish from `main`.

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

`.github/workflows/deploy-site.yml` builds all three, stitches docs under `/docs`
and the conformance runtime under `/conformance`, and deploys to Bunny + nsite. Configure deploy secrets with
`scripts/setup-site-secrets.sh`.

## Related

- **[NIP-5D](https://github.com/nostr-protocol/nips/pull/2303)** -- the living napplet-shell protocol specification (source of truth)
- **[NAPs track](https://github.com/napplet/naps)** -- where every NAP capability domain is proposed and defined

## License

MIT
