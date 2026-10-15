---
phase: 162-blossom-backed-large-asset-optimization
plan: "02"
subsystem: build-tools
tags: [nip-46, nostr, blossom, signer, deno, node, redaction]
requires:
  - phase: 162-01
    provides: retained asset optimization tracer and private resource mapping boundary
provides:
  - ESM-only cross-runtime @napplet/build-tools package contract layer
  - Verified least-authority NIP-46 signer for Blossom kind-24242 authorization
  - Redaction-safe sensitive value and adapter interfaces
affects: [162-03-pairing, 162-04-cli-migration, 162-05-blossom-upload, 162-06-cli-network]
tech-stack:
  added: ["@napplet/build-tools", "nostr-tools"]
  patterns: [injected NIP-46 relay boundary, deterministic request cleanup, opaque secret values]
key-files:
  created:
    - packages/build-tools/package.json
    - packages/build-tools/jsr.json
    - packages/build-tools/tsconfig.json
    - packages/build-tools/tsup.config.ts
    - packages/build-tools/src/contracts.ts
    - packages/build-tools/src/signer.ts
    - packages/build-tools/src/signer.test.ts
    - packages/build-tools/src/index.ts
  modified: []
key-decisions:
  - "Keep encrypted kind-24133 transport behind an injected RelayClient while the shared signer owns only canonical NIP-46 request correlation, verification, and lifecycle cleanup."
  - "Make RedactedSecret reveal values only through a bounded callback and redact string, JSON, inspection, and Error-derived views."
  - "Allow only get_public_key and sign_event for kind 24242, verify every signed response locally, and reject all other event kinds before transport."
patterns-established:
  - "Cross-runtime services receive relay, clock, terminal, process, filesystem, secret-store, and logger adapters rather than evaluating Node or Deno globals."
  - "Relay requests use a locally generated ID, an abort signal, injected timeout, and exactly one terminal cleanup path."
requirements-completed: []
coverage:
  - id: D1
    description: "Platform-neutral ESM build-tools contracts compile without CLI or Vite-plugin coupling."
    verification:
      - kind: unit
        ref: "pnpm exec tsc --noEmit -p packages/build-tools/tsconfig.json"
        status: pass
      - kind: other
        ref: "deno check --no-lock packages/build-tools/src/index.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "The NIP-46 signer enforces least authority, verifies signed kind-24242 results, cleans up failures, and redacts secrets."
    verification:
      - kind: unit
        ref: "packages/build-tools/src/signer.test.ts#5 Deno tests"
        status: pass
      - kind: other
        ref: "pnpm --filter @napplet/build-tools build"
        status: pass
    human_judgment: false
metrics:
  duration: "3 min"
  completed: "2026-08-21"
  tasks_completed: 2
  files_changed: 8
status: complete
---

# Phase 162 Plan 02: Build Tools Signer Foundation Summary

Established an ESM-only, Node/Deno-neutral build-service package with a verified NIP-46 signer that permits only Blossom kind-24242 authorization events.

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-21T15:25:11Z
- **Completed:** 2026-08-21T15:28:26Z
- **Tasks:** 2/2
- **Files changed:** 8

## Accomplishments

- Created `@napplet/build-tools` without changing root workspace metadata or lockfiles; its public contract layer has no CLI or Vite-plugin dependency.
- Added injected relay, clock, terminal, protected-store, process/filesystem, and safe-logger contracts plus an opaque `RedactedSecret` that is safe in ordinary output paths.
- Implemented and isolated a NIP-46 signer that requests only `get_public_key` and kind-24242 `sign_event`, correlates response IDs, verifies event signature/ID/author/kind, and closes pending relay work on every terminal path.

## Task Commits

1. **Task 1: Establish package metadata and platform-neutral contracts** — `05f6caea` (`feat`)
2. **Task 2 RED: Add failing signer core vectors** — `19c41fb0` (`test`)
3. **Task 2 GREEN: Implement verified signer core** — `3d1f9d22` (`feat`)
4. **Task 2: Configure ESM declarations** — `1ad607d9` (`chore`)

## Files Created

- `packages/build-tools/package.json` and `jsr.json` — ESM npm/JSR package identity with existing `nostr-tools` dependency.
- `packages/build-tools/tsconfig.json` and `tsup.config.ts` — strict source checks and ESM declaration output.
- `packages/build-tools/src/contracts.ts` — neutral adapter interfaces and non-rendering `RedactedSecret`.
- `packages/build-tools/src/signer.ts` — bounded NIP-46 request lifecycle and signed-event verification.
- `packages/build-tools/src/signer.test.ts` — isolated Deno vectors for authority, verification, cleanup, and redaction.
- `packages/build-tools/src/index.ts` — documented package public surface.

## Verification

- PASS — `pnpm exec tsc --noEmit -p packages/build-tools/tsconfig.json`
- PASS — `deno test --no-lock packages/build-tools/src/signer.test.ts` (5 passed)
- PASS — `deno check --no-lock packages/build-tools/src/index.ts`
- PASS — `pnpm --filter @napplet/build-tools build`
- PASS — plan commit range contains only `packages/build-tools/**`; root `package.json`, `deno.json`, `deno.lock`, and lockfiles were not changed by this plan.
- PASS — `git diff --check 05f6caea^ HEAD`

## TDD Gate Compliance

- RED: `19c41fb0` recorded a failing Deno test because `createBuildSigner` was absent.
- GREEN: `3d1f9d22` implements the signer and makes every vector pass.
- REFACTOR: no separate cleanup commit was required.

## Decisions Made

- Keep NIP-44 encryption and kind-24133 transport in a platform adapter; no private relay protocol is introduced by the shared package.
- Treat any uncorrelated, malformed, rejected, or unverifiable remote result as a safe generic signer failure; remote payloads never enter error output.
- Cache only a verified user public key and verify the returned authorization event against that key before returning it to a caller.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 162-03 can now add QR/paste pairing and protected session persistence over the established adapter and signer contracts. Root dirty workspace and lockfile edits remain untouched and unstaged.

## Self-Check: PASSED

- All eight planned `packages/build-tools` files exist.
- Task and TDD commits `05f6caea`, `19c41fb0`, `3d1f9d22`, and `1ad607d9` exist in git history.
