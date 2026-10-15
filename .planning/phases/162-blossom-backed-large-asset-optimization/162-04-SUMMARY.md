---
phase: 162-blossom-backed-large-asset-optimization
plan: "04"
subsystem: cli
tags: [cli, nip-46, signer, secret-store, blossom]
dependency_graph:
  requires: [162-02, 162-03]
  provides: [cli-shared-build-signer-adapters]
  affects: [packages/cli, packages/build-tools]
tech_stack:
  added: []
  patterns: [opaque-secret-handoff, lazy-narrow-signer, terminal-adapter]
key_files:
  created: []
  modified:
    - packages/cli/src/nostr-connect.ts
    - packages/cli/src/key-store.ts
    - packages/cli/src/deploy-signer.ts
    - packages/cli/tests/nostr_connect_test.ts
    - packages/cli/tests/key_store_test.ts
    - packages/cli/tests/deploy_signer_test.ts
    - packages/build-tools/src/index.ts
    - packages/build-tools/src/secret-store.ts
    - packages/build-tools/src/signer.ts
    - packages/build-tools/src/terminal.ts
    - packages/build-tools/tsconfig.json
decisions:
  - "Keep the public NappletSigner for generic manifest signing; invoke the narrow shared BuildSigner only for Blossom kind 24242 authorization."
  - "Adapt legacy CLI credential providers at the boundary with RedactedSecret rather than exposing plaintext remote-session secrets."
metrics:
  tasks_completed: 2
  files_modified: 11
  completed_date: 2026-08-21
status: complete
---

# Phase 162 Plan 04: CLI Shared Signer Migration Summary

The CLI now shares verified NIP-46 pairing, opaque secret storage, and Blossom authorization signing with `@napplet/build-tools` while keeping its established QR, paste, local-key, generic remote, and unsigned deployment surfaces compatible.

## Tasks Completed

1. **Route CLI pairing through shared signer** — QR and pasted bunker flows delegate first-success coordination and verified kind-24242 sessions to `pairBuildSigner`, with Deno-specific relay and terminal adapters preserving existing output and deterministic cleanup.
2. **Adapt deploy signing to shared signer** — the CLI key store exposes the shared opaque `SecretStore` contract, and persisted remote sessions use `reconnectBuildSigner` lazily for kind 24242 while all other event kinds retain the public `NappletSigner` behavior.

## Verification

- `deno test --allow-env --allow-read packages/cli/tests/nostr_connect_test.ts` — 7 passed.
- `deno test --allow-env --allow-read --allow-write --allow-run packages/cli/tests/key_store_test.ts packages/cli/tests/deploy_signer_test.ts` — 20 passed.
- `deno test --allow-all packages/cli/tests` — 125 passed.
- `deno check --no-lock packages/cli/src/cli.ts` — passed.
- `pnpm --filter @napplet/build-tools type-check` — passed.
- `pnpm --filter @napplet/build-tools build` — passed.
- Task-source secret scan and `git diff --check` — passed; no raw bunker secret or private-key pattern was added outside opaque test vectors.

## TDD Gate Compliance

- Task 1 RED: `cebf1d1c`; GREEN: `871fa47f`.
- Task 2 RED: `03c1716c`, `04708447`; GREEN: `ddedd7b9`.

## Decisions Made

- Preserve `NappletSigner` as the generic deploy-signing surface and scope the shared `BuildSigner` to the kind-24242 Blossom authorization it verifies.
- Preserve remote-session secrecy by converting provider values directly into `RedactedSecret` at the CLI boundary and only revealing them to the reconnect adapter.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 3 - Blocking issue] Restored standalone Deno resolution for build-tools internals**
- **Found during:** Task 2 full CLI suite verification.
- **Issue:** The CLI source map imports `@napplet/build-tools` directly from TypeScript, while the package's internal `.js` source specifiers could not resolve during Deno compilation.
- **Fix:** Switched only internal build-tools source references to explicit `.ts` extensions and enabled TypeScript extension imports. Bundled package output remains verified by the package build.
- **Files modified:** `packages/build-tools/tsconfig.json`, `packages/build-tools/src/index.ts`, `packages/build-tools/src/secret-store.ts`, `packages/build-tools/src/signer.ts`, `packages/build-tools/src/terminal.ts`.
- **Commit:** `4211b61d`.

## Known Stubs

None.

## Self-Check: PASSED

All 11 modified implementation and test files exist, all six task commits resolve in repository history, and the modified production sources contain no placeholder or TODO stub markers.
