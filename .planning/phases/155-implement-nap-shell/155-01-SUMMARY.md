---
phase: 155-implement-nap-shell
plan: 01
subsystem: protocol-sdk
tags: [nap-shell, handshake, capabilities, shim, conformance]
requires: ["154-01"]
provides:
  - "@napplet/core NAP-SHELL types (NappletShell, ShellEnvironment, ShellCapabilities, ShellReadyMessage, ShellInitMessage)"
  - "@napplet/nap/shell subpath (DOMAIN + re-exported types + pure shim helpers + sdk getters)"
  - "@napplet/shim NAP-SHELL handshake: posts shell.ready, caches shell.init { capabilities:{domains,protocols}, services, class }, exposes supports/services/class/ready/onReady"
  - "@napplet/conformance recognizes shell.ready (out) + shell.init (in); reference shell + boot + checks migrated to NAP-SHELL"
affects:
  - packages/core
  - packages/nap
  - packages/shim
  - packages/conformance
tech-stack:
  added: []
  patterns:
    - "Foundational (non-supports()-discoverable) domain registered separately from NAP_DOMAINS"
    - "Pure subpath helpers (createShellEnvironment/makeSupports) composed by the central shim"
    - "First-init-wins idempotency for the shell.init handshake"
key-files:
  created:
    - packages/core/src/types/shell.ts
    - packages/nap/src/shell/types.ts
    - packages/nap/src/shell/shim.ts
    - packages/nap/src/shell/sdk.ts
    - packages/nap/src/shell/index.ts
    - packages/nap/src/shell/shim.test.ts
    - packages/shim/src/shell.test.ts
  modified:
    - packages/core/src/types/global.ts
    - packages/core/src/types.ts
    - packages/core/src/envelope.ts
    - packages/core/src/index.ts
    - packages/core/src/index.test.ts
    - packages/nap/package.json
    - packages/nap/jsr.json
    - packages/nap/tsup.config.ts
    - packages/shim/src/index.ts
    - packages/conformance/src/validators/envelope.ts
    - packages/conformance/src/validators/envelope.test.ts
    - packages/conformance/src/validators/envelope.drift.test.ts
    - packages/conformance/src/shell/reference-shell.ts
    - packages/conformance/src/shell/reference-shell.test.ts
    - packages/conformance/src/run/boot.ts
    - packages/conformance/src/checks/catalog.ts
    - packages/shim/README.md
    - packages/core/README.md
    - apps/docs/packages/shim.md
    - apps/docs/guide/concepts.md
decisions:
  - "shell registered separately (FOUNDATIONAL_DOMAINS) — not added to NAP_DOMAINS — so validateEnvelope accepts shell.* without making shell supports()-discoverable"
  - "NAP-SHELL wire shapes live in @napplet/core (single source of truth); @napplet/nap/shell re-exports them + DOMAIN"
  - "shim.ts helpers kept pure (createShellEnvironment/makeSupports/defaultSupports); central @napplet/shim owns mount + listener + module state"
  - "drift guard uses the explicit-exempt path (shell re-exported from core ⇒ no scannable nap source literal) + a direct shell.* assertion"
metrics:
  duration: ~25m
  completed: 2026-06-17
---

# Phase 155 Plan 01: Implement NAP-SHELL Summary

NAP-SHELL — the mandatory, foundational bootstrap handshake — implemented end to end across `@napplet/core`, `@napplet/nap`, `@napplet/shim`, and `@napplet/conformance`, retiring the private `{ naps, sandbox }` `shell.init` shape for the canonical `{ capabilities: { domains, protocols }, services, class }` environment.

## What shipped

- **`@napplet/core`** — new `types/shell.ts`: `ShellCapabilities { domains, protocols }`, `ShellEnvironment`, `NappletShell` (`supports(domain, protocol?)`, `services`, `class`, `ready()`, `onReady()`), and the `ShellReadyMessage` / `ShellInitMessage` wire types, sourced verbatim from `/tmp/NAP-SHELL2.md`. `NappletGlobal['shell']` retyped to `NappletShell`; `NappletGlobalShell` removed (sole consumer migrated); `ShellSupports` kept (still consumed by `@napplet/sdk`).
- **`@napplet/nap/shell`** — new subpath mirroring `theme/` (types/shim/sdk/index), wired into `package.json`/`jsr.json`/`tsup.config.ts`. Re-exports the canonical types + `DOMAIN = 'shell'`; exports pure `createShellEnvironment` / `makeSupports` / `defaultSupports` and the `shell*` sdk getters; registers the foundational `shell` domain with core dispatch.
- **`@napplet/shim`** — migrated off `{naps,sandbox}`: on the first `shell.init` it builds a `ShellEnvironment` via `createShellEnvironment`, caches it, swaps in `makeSupports`, sets `services`/`class`, resolves pending `ready()` promises, and fires `onReady` handlers once. Duplicate `shell.init` is ignored (first wins). `shell.ready` post kept unchanged. Removed `defaultShellSupports`/`createShellSupports`/`installShellCapabilities` + all `perm:`/`sandbox` handling.
- **`@napplet/conformance`** — `validateEnvelope` accepts `shell` via `FOUNDATIONAL_DOMAINS` (not in `NAP_DOMAINS`); added `shell.ready` (out) + `shell.init` (in) specs; count invariant 122 → 124 (61 out / 63 in). Drift guard exempts the validator-owned foundational `shell` domain and asserts its discriminants directly. Reference shell replies `{ capabilities:{domains,protocols}, services, class }` (handshake still unrecorded); boot harness degraded path uses `{ domains:[], protocols:{} }`. `boot/installs-global`, `boot/no-boot-error`, `degrade/supports-false` re-titled/documented to cite NAP-SHELL (IDs/severities unchanged).
- **Docs** — core/shim READMEs + docs guide/concepts + docs/packages/shim describe the `shell.ready → shell.init` handshake and the full `window.napplet.shell` surface; stale `{naps,sandbox}` and `supports('perm:…')`/`nap:` examples replaced with `{domains,protocols}` queries.

## Requirements satisfied

SHELL-01 (validator recognizes shell.*; special-case removed; shell foundational), SHELL-02 (shim posts shell.ready, caches env, local synchronous supports), SHELL-03 (window.napplet.shell full surface typed in core), SHELL-04 (reference shell new shape; readiness still detected), SHELL-05 (@napplet/nap/shell subpath), SHELL-06 (boot/degrade checks cite NAP-SHELL).

## Deviations from Plan

None affecting design. Two minor mechanical notes:

- **[Rule 3 — blocking]** `packages/shim/src/shell.test.ts` initial `window as Window & { napplet }` cast failed the package `tsc` (stricter than the test runner: TS2352). Changed to `window as unknown as { napplet }`. No behavior change.
- The plan's Task 2 `node -e "import('@napplet/nap/shell')…"` verify run from the repo root cannot resolve the bare workspace package (no consumer in root `node_modules`). Confirmed instead from a consuming package dir (`packages/conformance`): `import('@napplet/nap/shell')` resolves with `DOMAIN === 'shell'`. Substantive check passes.

## Out-of-scope discovery (logged, not fixed)

`apps/docs/packages/shim.md` still lists `connect` and `class` rows (domains deferred/removed in Phase 154). Logged to `deferred-items.md`; outside Phase 155's NAP-SHELL scope.

## Verification

- `pnpm build` — green (11/11 tasks).
- `pnpm type-check` — green (15/15 tasks, 0 errors).
- `pnpm -r test:unit` — green: core 23, nap 61, shim 11, conformance 66, conformance-cli 8, vite-plugin 7.
- Surface sanity: `validateEnvelope({type:'shell.ready'}).ok === true` (direction `out`); `validateEnvelope({type:'shell.init',…})` → direction `in`, code `inbound-type-emitted`. Shim reader references `capabilities.domains` (zero `naps` references in `nap/src/shell/` or `shim/src/index.ts`).

## Commits

- `4eddcb5` feat(155-01): add NAP-SHELL types to @napplet/core
- `99de482` feat(155-01): add @napplet/nap/shell subpath and migrate shim to NAP-SHELL env
- `86a9ca6` feat(155-01): recognize NAP-SHELL in conformance; migrate reference shell + checks
- `e8e5438` docs(155-01): document the NAP-SHELL handshake and window.napplet.shell surface

## Self-Check: PASSED

All 7 created files present on disk; all 4 task commits present in git history.
