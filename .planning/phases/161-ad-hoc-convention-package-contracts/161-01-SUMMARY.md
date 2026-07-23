---
phase: 161-ad-hoc-convention-package-contracts
plan: "01"
subsystem: protocol-sdk
tags: [nap-intent, conventions, typescript, opaque-payloads]
requires:
  - phase: 161-ad-hoc-convention-package-contracts
    provides: "Convention-contract guard and migration context from Plan 06"
provides:
  - "Convention-only core and @napplet/nap/intent public types"
  - "Opaque convention forwarding through intent invoke and open helpers"
  - "Regression coverage for correlated results, unsuccessful results, and candidate conventions"
affects: [161-ad-hoc-convention-package-contracts, intent-runtime, downstream-convention-migration]
tech-stack:
  added: []
  patterns:
    - "Treat intent convention and payload as opaque data while preserving shell-side resolution"
key-files:
  created: []
  modified:
    - packages/core/src/types/intent.ts
    - packages/core/src/types/global/service-api.ts
    - packages/nap/src/intent/types.ts
    - packages/nap/src/intent/shim.ts
    - packages/nap/src/intent/shim.test.ts
key-decisions:
  - "Use only convention/conventions fields from the pinned NAP-INTENT contract; retain no IntentContract alias."
  - "Forward convention strings and unknown payloads unchanged; handler selection, authorization, and validation remain shell/receiver responsibilities."
patterns-established:
  - "Intent helper tests assert envelope forwarding and resolve structured unsuccessful results without converting them into transport exceptions."
requirements-completed: [CONV-PKG-01]
coverage:
  - id: D1
    description: "Core and NAP intent type barrels expose convention-only request, candidate, and result fields."
    requirement: CONV-PKG-01
    verification:
      - kind: unit
        ref: "packages/nap/src/intent/shim.test.ts#opaque convention and type assertions"
        status: pass
      - kind: other
        ref: "pnpm --filter @napplet/core type-check && pnpm --filter @napplet/nap type-check"
        status: pass
    human_judgment: false
  - id: D2
    description: "Intent invoke/open helpers forward opaque convention and payload data while preserving existing error boundaries."
    requirement: CONV-PKG-01
    verification:
      - kind: unit
        ref: "packages/nap/src/intent/shim.test.ts#open() forwards an opaque convention and payload without selecting a handler"
        status: pass
      - kind: unit
        ref: "pnpm --filter @napplet/nap test:unit"
        status: pass
    human_judgment: false
duration: 5min
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 01: Convention Package Contracts Summary

**NAP-INTENT now exposes convention-only types and forwards opaque convention strings and unknown payloads through the existing shell-mediated invocation path.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-23T13:33:42Z
- **Completed:** 2026-07-23T13:38:42Z
- **Tasks:** 2/2
- **Files modified:** 9

## Accomplishments

- Replaced the retired intent-contract surface with canonical `convention` and `conventions` fields across the core and NAP intent type barrels.
- Preserved correlation IDs, timeouts, structured unsuccessful results, and top-level transport-error behavior while proving opaque `open()` forwarding.
- Updated the global and SDK/shim public JSDoc so callers do not receive retired numbered-contract guidance.

## Task Commits

Each task was committed atomically:

1. **Task 1: Trace one opaque convention through core types and an intent invocation** - `3b781f3f` (test), `7350aec3` (feat)
2. **Task 2: Propagate the convention contract through global APIs and runtime helpers** - `fab4541b` (feat)

## Files Created/Modified

- `packages/core/src/types/intent.ts` - Defines canonical convention-only intent request, candidate, and result fields.
- `packages/core/src/index.ts` - Removes the retired `IntentContract` public export.
- `packages/core/src/types/global.ts` and `packages/core/src/types/global/service-api.ts` - Describe convention-only shell intent APIs.
- `packages/nap/src/intent/types.ts` and `packages/nap/src/intent/index.ts` - Expose NAP-INTENT convention types without compatibility aliases.
- `packages/nap/src/intent/shim.ts` and `packages/nap/src/intent/sdk.ts` - Preserve convention/payload forwarding in runtime and SDK helpers.
- `packages/nap/src/intent/shim.test.ts` - Covers opaque convention round trips, `open()` forwarding, failures, availability, and removed exports.

## Decisions Made

- Used the pinned NAP-INTENT contract directly: request and result use `convention`, while candidates advertise `conventions`.
- Kept convention values byte-for-byte opaque and payloads as `unknown`; this plan adds no aliases, normalization, parsing, payload schemas, or handler-routing bypass.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The newly strengthened `open()` regression test passed immediately because the existing helper already spreads option fields unchanged. The task therefore required documentation alignment and coverage, not a runtime forwarding rewrite.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| `packages/nap/src/intent/index.ts` | 75 | Pre-existing no-op dispatch registration placeholder; it was not altered by this plan and does not affect the shim's request/result forwarding path. |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Downstream Phase 161 plans can consume the convention-only intent source contract. The pre-existing dispatch-registration placeholder remains outside this plan's locked convention-only boundary and should not be used to infer new NAP-INTENT behavior.

## Self-Check: PASSED

- Confirmed the summary and the five key core/NAP source and test files exist.
- Confirmed Task 1 commits `3b781f3f` / `7350aec3` and Task 2 commit `fab4541b` exist in git history.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
