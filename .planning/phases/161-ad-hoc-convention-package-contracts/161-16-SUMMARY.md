---
phase: 161-ad-hoc-convention-package-contracts
plan: "16"
subsystem: protocol-types
tags: [typescript, nap-intent, uri, delivery, global-api]
requires:
  - phase: 161-01
    provides: Convention-only NAP-INTENT baseline types and forwarding surface
  - phase: 161-07
    provides: Clean-break active-surface convention migration
provides:
  - URI-derived NAP-INTENT request, discovery-contract, acceptance, and delivery types
  - Global URI-shaped invoke/open signatures with runtime-attested delivery subscription
affects: [161-17, 161-18, 161-19, 161-22, core, nap-intent]
tech-stack:
  added: []
  patterns:
    - Strict discriminated acceptance result separates runtime responsibility from delivery
    - URI-derived identity remains separate from optional invocation inputs
key-files:
  created:
    - packages/core/src/intent-contract.test.ts
  modified:
    - packages/core/src/types/intent.ts
    - packages/core/src/index.ts
    - packages/core/src/types/global/service-api.ts
    - packages/core/src/types/global.ts
key-decisions:
  - "IntentResult uses strict accepted/rejected branches; success only means runtime delivery responsibility."
  - "IntentApi invoke/open accept an authoritative URI and cannot accept caller overrides for URI-derived identity."
patterns-established:
  - "Target delivery is a separate no-ID, runtime-attested callback via onDelivery."
requirements-completed: [CONV-PKG-01]
coverage:
  - id: D1
    description: Canonical intent request, discovery contract, acceptance result, and no-ID delivery declarations
    requirement: CONV-PKG-01
    verification:
      - kind: unit
        ref: packages/core/src/intent-contract.test.ts#NAP-INTENT public contract
        status: pass
      - kind: other
        ref: pnpm --filter @napplet/core type-check
        status: pass
    human_judgment: false
  - id: D2
    description: URI-shaped global intent API with runtime-attested target delivery subscription
    requirement: CONV-PKG-01
    verification:
      - kind: other
        ref: pnpm --filter @napplet/core build && pnpm --filter @napplet/core type-check
        status: pass
      - kind: other
        ref: packages/core/dist/index.d.ts declaration inspection
        status: pass
    human_judgment: false
metrics:
  duration: 4 min
  completed: 2026-07-23
status: complete
---

# Phase 161 Plan 16: Core Intent URI and Delivery Contract Summary

**Core now defines URI-derived intent requests, strict runtime acceptance, manifest contracts, and no-ID target delivery through the global API.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-23T15:39:18Z
- **Completed:** 2026-07-23T15:43:16Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Added the canonical `IntentInvokeOptions`, normalized request identity, manifest `IntentContract`, strict accepted/rejected results, and runtime-attested `IntentDelivery` types.
- Re-exported every adopted intent type from `@napplet/core` and pinned both positive shapes and retired-field failures in type-level regression coverage.
- Replaced object-form global intent calls with authoritative URI calls and added the target-only `onDelivery` subscription contract.

## Task Commits

1. **Task 1: Define the public intent request, discovery, acceptance, and delivery types** - `fcac0cb0` (test), `7becbf44` (feat)
2. **Task 2: Replace object-form global intent calls with URI calls and onDelivery** - `7f6cea6c` (feat)

## Files Created/Modified

- `packages/core/src/intent-contract.test.ts` - Type-level regression coverage for adopted and retired intent fields.
- `packages/core/src/types/intent.ts` - Canonical URI request, contract, result, and delivery declarations.
- `packages/core/src/index.ts` - Public type exports for the adopted intent contract.
- `packages/core/src/types/global/service-api.ts` - URI-shaped `IntentApi` and `onDelivery` declaration with contract JSDoc.
- `packages/core/src/types/global.ts` - Updated global intent-domain guidance.

## Decisions Made

- `ok: true` means only that the runtime accepted responsibility for eventual delivery; post-acceptance lifecycle, retry, persistence, and terminal failure remain runtime policy.
- Caller options are limited to payload, handler preference, and behavior hints; URI-derived archetype, action, and convention identity are not overrideable.
- `IntentDelivery.sender` is runtime-attested provenance, and delivery intentionally exposes no correlation, delivery, or window identifier.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plans 161-17 through 161-19 can consume the core types to implement the URI normalizer, NAP wire delivery path, SDK exports, and runtime installation.

## Self-Check: PASSED

- Confirmed all five task files exist.
- Confirmed TDD and implementation commits `fcac0cb0`, `7becbf44`, and `7f6cea6c` exist in git history.
