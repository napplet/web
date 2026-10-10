# Dead-code audit and removal

Scope: every workspace package, app, script, and fixture on `main` (6079477d). Signals: `knip` (unused files, exports, dependencies), `tsc --noUnusedLocals --noUnusedParameters` per package, `deno lint no-unused-vars` for the CLI, and grep verification of every candidate against package export maps, JSR `exports`, tests, docs, and workflows.

## Confirmed dead and removed

1. `packages/shim/src/nipdb-shim.ts`: a `window.nostrdb` bridge that nothing imports, bundles, documents, or tests; no `nostrdb.*` wire type exists in any NAP.
2. `packages/shim/src/runtime-guard.ts` and its test: `installRuntimeGuard` / `markRuntimePresent` lost their last caller in #96 and are not exported from the package entry, so the guard never ships.
3. `amp`: an empty file at the repo root left by a planning commit.
4. `packages/conformance/src/shell/reference-handler.ts`: a redundant `REFERENCE_ENDPOINT` re-export (the public path is `reference-shell.ts`).
5. `packages/nap/src/resource/resource-transport.ts`: six `export` keywords on symbols only used inside the module (`REQUEST_TIMEOUT_MS`, `pendingBytes`, `pendingInfo`, `pendingMany`, `sendCancel`, `cancelMany`); the module is not a package entry.
6. `packages/sdk/src/require-napplet.ts`: `requireNapplet` is only used by `requireDomain` in the same file and is not re-exported.
7. `packages/vite-plugin/src/index.test.ts`: an unused `base` local.
8. Root `nostr-tools` devDependency (no importer; `@napplet/vite-plugin` declares its own), the root `lint` script and turbo task (no package defines `lint`), and the `@napplet/nap` dependency of `@napplet/conformance` (the drift guard reads NAP sources from the workspace path, never imports the package).

## Verified alive, kept

- CLI exports knip flagged are re-exported by `src/mod.ts`, the JSR root entry, or used by Deno tests.
- `scripts/install-napplet-cli.*` mirror `apps/web/public/install.*` by contract (`test-install-napplet-cli.mjs`, `deploy-site.yml`).
- `@napplet/conformance-web` (conformance-cli) and `@napplet/conformance-cli` (e2e harness) are path-consumed build-order dependencies.
- `ifc` aliases and duplicate `outbox` / `resource` / `upload` helper names are documented public API.
- `tests/fixtures/napplets/*` are all driven by the e2e harness.

## Flagged, not removed

- `docs/superpowers/specs/*`, `docs/conformance/boilerplate-integration.md`, `specs/SHELL-RESOURCE-POLICY.md`: orphaned design notes, not code; removal is an editorial call.
