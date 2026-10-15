---
phase: 162-blossom-backed-large-asset-optimization
plan: "03"
subsystem: build-services
tags: [nip-46, terminal, secret-store, deno, pnpm]
requires:
  - phase: 162-02
    provides: platform-neutral NIP-46 signer contracts and verified Blossom signer core
provides:
  - protected cross-platform storage for opaque reusable NIP-46 build sessions
  - abortable QR/deep-link and pasted-bunker terminal pairing
  - CLI-local Deno source resolution and audited pnpm build-tools importer
affects: [162-04, vite-plugin, cli, build-publishing]
tech-stack:
  added: []
  patterns: [injected credential providers, opaque process arguments, first-success pairing cancellation, no-lock Deno workspace validation]
key-files:
  created:
    - packages/build-tools/src/secret-store.ts
    - packages/build-tools/src/secret-store.test.ts
    - packages/build-tools/src/terminal.ts
    - packages/build-tools/src/terminal.test.ts
  modified:
    - packages/build-tools/src/contracts.ts
    - packages/build-tools/src/index.ts
    - packages/cli/deno.json
    - pnpm-lock.yaml
key-decisions:
  - "Use injected native credential commands and only an explicit file fallback; protected-provider errors never downgrade to plaintext."
  - "Race QR and bunker pairing through independent abort signals, persisting only a verified nbunksec winner."
  - "Validate CLI-local Deno mapping with --no-lock because Deno workspaces permit one resolver and workspace lock only."
patterns-established:
  - "Secret-bearing process arguments use RedactedSecret rather than raw diagnostic strings."
  - "Deno member import-map checks run from the member directory and preserve root plus legacy locks."
requirements-completed: []
coverage:
  - id: D1
    description: Protected platform-store selection and safe reusable NIP-46 session persistence.
    verification:
      - kind: unit
        ref: packages/build-tools/src/secret-store.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: QR/deep-link and pasted bunker pairing race with cancellation and safe terminal status.
    verification:
      - kind: unit
        ref: packages/build-tools/src/terminal.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: pnpm workspace package resolution and CLI-local Deno source import without changing either Deno lock.
    verification:
      - kind: other
        ref: pnpm build/type-check plus deno --no-lock mapping checks
        status: pass
    human_judgment: false
duration: 9min
completed: 2026-08-21
status: complete
---

# Phase 162 Plan 03: Terminal Pairing and Protected Session Storage Summary

**Platform-neutral NIP-46 terminal pairing with protected nbunksec persistence, safe QR/bunker cancellation, and audited npm/Deno workspace resolution.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-08-21T15:32:32Z
- **Completed:** 2026-08-21T15:41:00Z
- **Tasks:** 3/3
- **Files modified:** 9

## Accomplishments

- Added macOS Keychain, Linux Secret Service, Windows Credential Manager, and deliberate file-fallback stores behind injected process/filesystem adapters; successful protected writes retain opaque values and provider failures do not fall back to plaintext.
- Added a QR/deep-link versus pasted `bunker://` race that verifies the winning NIP-46 session before persisting it, cancels losing work, and emits only abbreviated safe status values.
- Added the CLI-local `@napplet/build-tools` source map and a minimal pnpm importer while preserving the known dirty root package/lock files and the legacy CLI lock byte-for-byte.

## Task Commits

1. **Task 1 RED: Protected session persistence vectors** — `7762b6e6` (`test`)
2. **Task 1 GREEN: Protected session store** — `0526096b` (`feat`)
3. **Task 2 RED: Terminal pairing vectors** — `c235bed7` (`test`)
4. **Task 2 GREEN: QR/paste pairing coordinator** — `62884213` (`feat`)
5. **Deno workspace correction** — `12b668ad` (`docs`)
6. **Task 3: npm and CLI-local Deno resolution** — `223f6f78` (`chore`)

## Files Created/Modified

- `packages/build-tools/src/secret-store.ts` — protected store selection and explicit file fallback.
- `packages/build-tools/src/terminal.ts` — abortable verified pairing and reconnect coordination.
- `packages/build-tools/src/contracts.ts` — opaque process argument contract for secret-safe adapters.
- `packages/build-tools/src/index.ts` — public pairing and storage exports.
- `packages/build-tools/src/*.test.ts` — Deno vectors for persistence, redaction, races, cleanup, and reconnect.
- `packages/cli/deno.json` — CLI-local relative build-tools source map.
- `pnpm-lock.yaml` — generated build-tools workspace importer only.

## Decisions Made

- Keep protected-provider failures fail-closed; only an explicit caller-provided fallback path can store a secret in a file.
- Require `nbunksec1` opaque material, valid remote identity/relay binding, and a verified signer public key before a session is reused or persisted.
- Follow Deno's workspace-only lock semantics: use the CLI member import map with `--no-lock`, leaving root `deno.lock` and legacy `packages/cli/deno.lock` untouched. [Deno workspace documentation](https://docs.deno.com/runtime/fundamentals/workspaces/)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Opaque process arguments for credential commands**
- **Found during:** Task 1
- **Issue:** The pre-existing process adapter accepted only raw strings, which would allow credential command secrets into captured diagnostics.
- **Fix:** Extended the neutral process contract to accept `RedactedSecret` arguments/input and used opaque values at the provider boundary.
- **Files modified:** `packages/build-tools/src/contracts.ts`, `packages/build-tools/src/secret-store.ts`
- **Verification:** `secret-store.test.ts` redaction snapshots pass.
- **Committed in:** `0526096b`

**2. [Rule 1 - Plan verification] Corrected invalid member-lock assumption**
- **Found during:** Task 3
- **Issue:** Deno's official workspace rules permit only one workspace resolver/lock, so generating `packages/cli/deno.lock` produced broad workspace churn.
- **Fix:** User-approved plan correction preserves both Deno locks and validates the CLI-local import map with `--no-lock` from the CLI member directory.
- **Files modified:** `.planning/phases/162-blossom-backed-large-asset-optimization/162-03-PLAN.md`
- **Verification:** pnpm importer audit and Deno source/import-map checks pass.
- **Committed in:** `12b668ad`

**Total deviations:** 2 auto-fixed (1 Rule 2, 1 Rule 1). **Impact:** Security redaction and Deno's authoritative workspace semantics are satisfied without scope expansion.

## Issues Encountered

- The first Deno cache attempt broadened the legacy CLI lock with unrelated workspace members. It was restored before staging; the amended plan uses the officially supported `--no-lock` member-resolution check instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Later Vite-plugin work can consume the isolated pairing/store APIs through injected runtime adapters.
- The root `package.json` (`d1c4285a…`) and root `deno.lock` (`eca06fdb…`) remain unowned, unstaged, and byte-identical throughout this plan; legacy `packages/cli/deno.lock` remains `24324f5f…`.

## Self-Check: PASSED

- All six created/integrated source and configuration files exist.
- All six task and correction commits exist in git history.

---
*Phase: 162-blossom-backed-large-asset-optimization*
*Completed: 2026-08-21*
