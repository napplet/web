---
phase: 161-ad-hoc-convention-package-contracts
plan: "15"
subsystem: convention-uri
tags: [nap-inc, nap-intent, convention-uri, query-transposition, vitest]
requires:
  - phase: 161-13
    provides: INC outbound query transposition and exact receive-side routing coverage.
  - phase: 161-14
    provides: Adopted convention-URI authoring guidance.
provides:
  - One internal normalizer for adopted convention-URI call boundaries.
  - INC outbound preprocessing delegated to the shared normalizer.
  - Queryless convention subscriptions with opaque non-convention topic routing.
affects: [intent-shim, nap-inc, convention-uri-consumers]
tech-stack:
  added: []
  patterns:
    - Internal URI normalizer is not re-exported from the public package barrel.
    - Query transposition runs only at an adopted outbound boundary; receive-side routing remains exact.
key-files:
  created:
    - packages/nap/src/convention-uri.ts
    - packages/nap/src/convention-uri.test.ts
  modified:
    - packages/nap/src/inc/shim.ts
    - packages/nap/src/inc-compat.test.ts
key-decisions:
  - "Use raw pair splitting plus decodeURIComponent so literal plus signs remain literal."
  - "Delegate INC preprocessing only for documented napplet:<archetype>/<intent> forms and forward all other topics unchanged."
patterns-established:
  - "Shared convention URI normalization returns URI-derived archetype, action, queryless convention, and optional payload without public export."
requirements-completed: [CONV-PKG-01, CONV-PKG-04]
coverage:
  - id: D1
    description: Internal normalization derives stable identity and transposes or rejects query input per the adopted matrix.
    requirement: CONV-PKG-01
    verification:
      - kind: unit
        ref: packages/nap/src/convention-uri.test.ts
        status: pass
      - kind: other
        ref: pnpm --filter @napplet/nap type-check
        status: pass
    human_judgment: false
  - id: D2
    description: INC emits the stable envelope while exact receive-side routing and opaque-topic forwarding remain unchanged.
    requirement: CONV-PKG-04
    verification:
      - kind: unit
        ref: packages/nap/src/inc-compat.test.ts
        status: pass
    human_judgment: false
duration: 2min
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 15: Shared Convention URI Normalizer Summary

**One internal URI normalizer now supplies stable convention identity and shallow query payload handling for adopted call boundaries while INC delivery continues to route exact opaque topics.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-23T15:37:57Z
- **Completed:** 2026-07-23T15:40:38Z
- **Tasks:** 1/1
- **Files modified:** 4

## Accomplishments

- Added the internal `normalizeConventionUri` primitive, deriving archetype, action, queryless convention, and an optional shallow text payload.
- Moved INC's raw query splitting and percent decoding into that shared primitive without changing the `inc.emit` wire envelope.
- Locked literal-plus, malformed-escape, duplicate-name, fragment, explicit-payload, exact-routing, and opaque-topic behavior in focused Vitest coverage.
- Preserved prototype-shaped decoded names as ordinary own payload fields and rejected query- or fragment-bearing convention subscriptions before `postMessage`.

## Task Commits

1. **Task 1: Trace one queried convention through the shared primitive and INC envelope** - `a136dda9` (test, RED), `8d1f2270` (feat, GREEN)
2. **Follow-up contract hardening** - `3e5db3e7` (prototype-shaped fields), `09667f00` (subscription RED), `bdace03d` (queryless subscription GREEN)

## Files Created/Modified

- `packages/nap/src/convention-uri.ts` - Internal shared convention-URI normalizer.
- `packages/nap/src/convention-uri.test.ts` - Cross-operation normalization and rejection matrix.
- `packages/nap/src/inc/shim.ts` - Delegates documented outbound convention input to the normalizer and keeps convention subscriptions queryless.
- `packages/nap/src/inc-compat.test.ts` - Confirms query-bearing convention subscriptions reject while non-convention topics remain opaque.

## Decisions Made

- Used raw splitting and `decodeURIComponent`, preserving literal `+` and avoiding form or scalar decoding.
- Kept the helper internal and restricted INC invocation to documented convention forms; subscriptions and delivered events remain queryless exact-string routing.

## TDD Gate Compliance

- **RED:** `a136dda9` introduced the normalizer matrix; the focused suite failed because the module did not exist.
- **GREEN:** `8d1f2270` implemented the helper and INC refactor; focused tests and the NAP type-check pass.

## Deviations from Plan

The post-plan review added prototype-key payload safety and explicit enforcement
of the adopted queryless subscription rule; both stay within the planned URI
and exact-routing contract.

## Issues Encountered

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The intent shim can import the same internal normalizer for its separately adopted URI boundary without coupling intent delivery to INC.

## Self-Check: PASSED

- Confirmed all four plan-owned source/test files and this summary exist.
- Confirmed TDD commits `a136dda9` and `8d1f2270` exist in git history.
- Confirmed no stubs, unrun verification, unexpected deletions, or threat surface outside the plan register.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
