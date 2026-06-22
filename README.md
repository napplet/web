> napplet is **alpha**. The specification is experimental and a moving target. There **will most certainly be drift** between packages and the specification. Things **will most certainly change**. **For adventurers only.**

# napplet

[![CI](https://github.com/napplet/napplet/actions/workflows/ci.yml/badge.svg)](https://github.com/napplet/napplet/actions/workflows/ci.yml)
[![AI Slop Score](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fnapplet%2Fweb%2Fbadges%2Faislop-score.json)](https://github.com/napplet/web/actions/workflows/ai-slop.yml)
[![Publish](https://github.com/napplet/napplet/actions/workflows/publish.yml/badge.svg)](https://github.com/napplet/napplet/actions/workflows/publish.yml)
[![Publish to JSR](https://github.com/napplet/napplet/actions/workflows/publish-jsr.yml/badge.svg)](https://github.com/napplet/napplet/actions/workflows/publish-jsr.yml)

Monorepo for the **napplet** SDK -- libraries for building NIP-5D Nostr Web Applets - "napplets"

A **napplet** is a sandboxed web app that runs inside a **shell**. The shell and napplet communicate over `postMessage` using a JSON envelope format (`{ type, ...payload }`) defined by NIP-5D. The napplet never touches `localStorage`, relay connections, or signing keys directly -- the shell proxies everything through NAP interfaces. [Read about napplets in NIP-5D possiblity](https://github.com/nostr-protocol/nips/pull/2303/changes)

## Packages

| Package | npm | JSR | Description |
|---------|-----|-----|-------------|
| [@napplet/core](packages/core) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fcore?label=npm)](https://www.npmjs.com/package/@napplet/core) | [![JSR](https://jsr.io/badges/@napplet/core)](https://jsr.io/@napplet/core) | JSON envelope types (`NappletMessage`, `NapDomain`), NAP dispatch infrastructure (`registerNap`, `dispatch`), protocol constants and Nostr types. Imported by all other packages. |
| [@napplet/shim](packages/shim) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fshim?label=npm)](https://www.npmjs.com/package/@napplet/shim) | [![JSR](https://jsr.io/badges/@napplet/shim)](https://jsr.io/@napplet/shim) | Side-effect-only window installer for napplet iframes. Importing `@napplet/shim` installs the `window.napplet` global and registers with the shell. Sends JSON envelope messages via postMessage. Zero named exports. |
| [@napplet/sdk](packages/sdk) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fsdk?label=npm)](https://www.npmjs.com/package/@napplet/sdk) | [![JSR](https://jsr.io/badges/@napplet/sdk)](https://jsr.io/@napplet/sdk) | Named TypeScript exports wrapping `window.napplet` for bundler consumers. Provides `relay`, `inc`, `services`, `storage` objects plus NAP message type re-exports. |
| [@napplet/nap](packages/nap) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fnap?label=npm)](https://www.npmjs.com/package/@napplet/nap) | [![JSR](https://jsr.io/badges/@napplet/nap)](https://jsr.io/@napplet/nap) | Compatibility package for 17 NAP domain subpaths (relay, storage, inc, ifc, keys, shell, theme, media, notify, identity, config, resource, cvm, outbox, upload, intent, link) with barrel + granular (types/shim/sdk) exports. Tree-shakable (`sideEffects: false`). Includes ownership-aware `media` and `resource`, the ContextVM `cvm` bridge, outbox-aware `outbox` relay routing, shell-mediated `upload`, archetype `intent` dispatch, shell-mediated `link` opening, and read-only `identity` helpers. See [packages/nap/README.md](packages/nap/README.md) for the full subpath reference. |
| [@napplet/vite-plugin](packages/vite-plugin) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fvite-plugin?label=npm)](https://www.npmjs.com/package/@napplet/vite-plugin) | [![JSR](https://jsr.io/badges/@napplet/vite-plugin)](https://jsr.io/@napplet/vite-plugin) | Vite plugin for NIP-5D manifest generation. Computes per-file SHA-256 hashes, signs a kind 35129 napplet manifest event (NIP-5A `path` + aggregate `x` tag schema) at build time, and injects `requires` meta tags. Options: required `nappletType` (the `d` tag), optional `requires` service dependencies, an `artifactMode` (`external-assets` default or `single-file`), an optional `configSchema` (NAP-CONFIG), and NAAT archetype role tags. |
| [@napplet/boilerplate](packages/boilerplate) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fboilerplate?label=npm)](https://www.npmjs.com/package/@napplet/boilerplate) | — | Interactive `npx @napplet/boilerplate` generator that clones the `github.com/napplet/boilerplate` template, asks for destination/name/type, and prepares a Vite + TypeScript napplet starter. |
| [@napplet/conformance](packages/conformance) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fconformance?label=npm)](https://www.npmjs.com/package/@napplet/conformance) | [![JSR](https://jsr.io/badges/@napplet/conformance)](https://jsr.io/@napplet/conformance) | Framework-agnostic conformance engine: hand-written per-NAP envelope validators for active wire domains, a manifest/meta validator, a scriptable reference mock shell, the zero-config check catalog, and pretty/JSON/JUnit reporters. Browser-safe; reused by both the CLI and the web runtime. |
| [@napplet/conformance-cli](packages/conformance-cli) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fconformance-cli?label=npm)](https://www.npmjs.com/package/@napplet/conformance-cli) | — | Headless `napplet-conformance` runner. Drives the engine against a napplet in real Chromium (Playwright) and sets a CI exit code — wire it up as `test:conformance`. npm-only (Playwright dependency). |
| [@napplet/skills](packages/skills) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fskills?label=npm)](https://www.npmjs.com/package/@napplet/skills) | [![JSR](https://jsr.io/badges/@napplet/skills)](https://jsr.io/@napplet/skills) | Agent skills (`design-napplet`, `build-napplet`, `test-napplet`) that let a coding agent create a napplet end-to-end. The `napplet-skills` CLI installs them into Claude Code, Cursor, Windsurf, `AGENTS.md` (Codex/Amp), Gemini, or Copilot. |

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
conformance: manifest/meta validity, boots under `sandbox="allow-scripts"`, installs
`window.napplet`, every emitted envelope is well-formed, graceful degradation when
`shell.supports()` is false, and no forbidden globals.

## Changelog

- **Conformance tooling** — new `@napplet/conformance` engine + `@napplet/conformance-cli` runner + standalone `apps/conformance` web runtime let a napplet self-verify NAP protocol conformance headlessly (CI) and live in the browser. Hand-written per-NAP envelope validators (drift-guarded against `@napplet/nap`), manifest checks, a reference mock shell, and a `test:conformance`-ready CLI.
- **v0.32.0 — Read-Only NAP-IDENTITY** — `identity.getPublicKey()` is a snapshot that resolves to a hex pubkey or `""` when no user is connected, and `identity.onChanged(handler)` receives shell-pushed `identity.changed` updates. Identity no longer exposes decrypt, encrypt, or signing operations.
## Architecture

### Package Dependency Graph

```
@napplet/shim ──┐
                ├──► @napplet/nap ──► @napplet/core
@napplet/sdk  ──┘

@napplet/vite-plugin  (build-time only, depends on nostr-tools)

@napplet/boilerplate  (CLI generator, clones github.com/napplet/boilerplate)
```

### Napplet-Side Communication

```
Shell (any compatible shell)                @napplet/shim
  ShellBridge                                window.napplet.relay (subscribe/publish/query)
  ├── JSON envelope message routing          window.napplet.inc   (emit/on)
  ├── Identity via message.source            window.napplet.storage (get/set/remove)
  ├── ACL enforcement                        window.napplet.resource (bytes/bytesAsObjectURL)
  ├── NAP dispatch (relay/signer/storage)    window.napplet.shell.supports(domain)
  └── INC routing

◄────────── postMessage: { type: 'relay.subscribe', id, filters } ──────────►
◄────────── postMessage: { type: 'relay.event', subId, event }    ──────────►

@napplet/vite-plugin (build time)
  └── NIP-5D manifest generation + requires tag injection
```

The iframe sandbox requires only `allow-scripts` -- **no `allow-same-origin`**. Shells MAY add additional tokens (`allow-forms`, `allow-popups`, etc.) per shell policy. Napplets cannot access the host shell's DOM, cookies, localStorage, or service workers. All persistent state goes through the shell's proxies.

## Origin

The napplet protocol is defined by the living [NIP-5D specification](https://github.com/nostr-protocol/nips/pull/2303); the NAP capability domains are defined on the [NAPs track](https://github.com/napplet/naps). Any shell can host napplets, and any web app can become a napplet by importing `@napplet/shim`.

## Development

```bash
pnpm install
pnpm build        # Build all packages via turborepo
pnpm type-check   # TypeScript validation
npx @napplet/boilerplate  # Scaffold a new napplet from the template repo
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
