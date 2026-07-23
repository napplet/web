---
phase: 161-ad-hoc-convention-package-contracts
plan: "07"
subsystem: sdk-shim-conformance
tags: [nap-intent, conventions, sdk, shim, conformance]
requires:
  - phase: 161-01
    provides: convention-only NAP-INTENT public types
  - phase: 161-05
    provides: convention-agnostic conformance baseline
provides:
  - SDK type exports without retired intent-contract surface
  - Convention-only SDK intent documentation
  - Verified transport-stable shim and current conformance presentation
affects: [sdk consumers, shim hosts, conformance users]
tech-stack:
  added: []
  patterns:
    - Type-only compatibility audits remove retired exports without adding runtime negotiation.
key-files:
  created: []
  modified:
    - packages/sdk/src/nap-types.ts
    - packages/sdk/src/cvm.ts
key-decisions:
  - "Intent payloads remain opaque convention data; the SDK adds no parser, alias, resolver, or handler-selection behavior."
  - "Shim transport and conformance CLI/web copy were already current, so their audited files remain byte-identical."
patterns-established:
  - "Preserve generic NAP protocol terminology while removing only retired numbered intent-contract guidance."
requirements-completed: [CONV-PKG-01, CONV-PKG-05]
coverage:
  - id: D1
    description: SDK no longer re-exports the retired IntentContract type and describes intent payloads through opaque conventions.
    requirement: CONV-PKG-01
    verification:
      - kind: other
        ref: pnpm --filter @napplet/sdk build && pnpm --filter @napplet/sdk type-check
        status: pass
      - kind: other
        ref: pnpm build && pnpm type-check
        status: pass
    human_judgment: false
  - id: D2
    description: Shim hosting remains transport-stable without retired intent fields or negotiation behavior.
    requirement: CONV-PKG-01
    verification:
      - kind: unit
        ref: pnpm --filter @napplet/shim build && pnpm --filter @napplet/shim type-check && pnpm --filter @napplet/shim test:unit
        status: pass
    human_judgment: false
  - id: D3
    description: Conformance CLI and web presentation retain current generic terminology without claiming payload validation.
    requirement: CONV-PKG-05
    verification:
      - kind: other
        ref: pnpm --filter @napplet/conformance-cli build && pnpm --filter @napplet/conformance-web build && pnpm --filter @napplet/conformance-web type-check
        status: pass
    human_judgment: false
duration: 7 min
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 07: SDK, Shim, and Conformance Surface Summary

**SDK intent types now expose only the convention model, while shim transport and conformance presentation remain unchanged and convention-agnostic.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-23T14:17:00Z
- **Completed:** 2026-07-23T14:24:06Z
- **Tasks:** 3/3
- **Files modified:** 2

## Accomplishments

- Removed the stale `IntentContract` type re-export from the SDK's public type barrel.
- Updated SDK intent JSDoc to describe opaque convention-based payloads without adding parsing, negotiation, or resolution behavior.
- Verified shim injection and conformance CLI/web presentation were already free of retired intent-contract language; kept them unchanged.

## Task Commits

1. **Task 1: Compile SDK type propagation against convention-only intent** - `8c2e0ba2` (`fix`)
2. **Task 2: Audit shim hosting surfaces without changing transport** - verification-only; no code change was needed
3. **Task 3: Align conformance CLI and web copy** - verification-only; no code change was needed

## Files Created/Modified

- `packages/sdk/src/nap-types.ts` - Removes the retired `IntentContract` re-export.
- `packages/sdk/src/cvm.ts` - Updates intent helper JSDoc from removed numbered protocols/contracts to opaque conventions.

## Decisions Made

- Kept intent payload data opaque and shell-owned: no convention parser, compatibility alias, query behavior, or client-side authorization path was added.
- Preserved generic NAP protocol wording in the conformance CLI/web because it does not claim the retired numbered contract or payload validation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Retired intent-contract guidance in an SDK helper**
- **Found during:** Task 1
- **Issue:** `packages/sdk/src/cvm.ts` still described intent delivery using a named NAP-N protocol and manifest-derived contracts, contrary to the convention-only public contract.
- **Fix:** Reworded the existing JSDoc to describe opaque conventions only; runtime behavior was not changed.
- **Files modified:** `packages/sdk/src/cvm.ts`
- **Verification:** SDK build/type-check and full repository build/type-check pass.
- **Committed in:** `8c2e0ba2`

**Total deviations:** 1 auto-fixed (Rule 2)
**Impact on plan:** Documentation-only alignment required to prevent propagation of retired protocol guidance; no transport or validation semantics changed.

## Issues Encountered

- The changed-scope AI-slop scan remains 86/100 due pre-existing large-file warnings, an existing narrative-comment warning, and the root `js-yaml` advisory outside this plan's files. Focused and full build, type-check, and unit gates pass.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

SDK, shim, and conformance presentation surfaces are aligned with convention-only intent types. INC query transposition remains intentionally outside this plan for the separately planned gap work.

## Self-Check: PASSED

- Confirmed the summary and both SDK files exist.
- Confirmed task commit `8c2e0ba2` exists in git history.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
