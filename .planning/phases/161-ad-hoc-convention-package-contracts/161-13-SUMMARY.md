---
phase: 161-ad-hoc-convention-package-contracts
plan: "13"
subsystem: inc-runtime
tags: [nap-inc, convention-uri, query-transposition, sdk, vitest]
requires:
  - phase: 161-02
    provides: Exact opaque INC topic routing and receive-side regression coverage.
  - phase: 161-07
    provides: Convention-current SDK type propagation.
provides:
  - Clean-break INC `emit(topic, payload?)` declarations and wrappers.
  - Convention-URI query transposition before the `inc.emit` wire envelope.
  - Rejection coverage for malformed and ambiguous convention URI input.
affects: [@napplet/core, @napplet/nap, @napplet/sdk, NAP-INC consumers]
tech-stack:
  added: []
  patterns:
    - Query transposition happens only in outbound INC emit preprocessing.
    - Inbound INC delivery keeps exact `Map.get(msg.topic)` routing.
key-files:
  created: []
  modified:
    - packages/core/src/types/global/nostr-api.ts
    - packages/nap/src/inc/types.ts
    - packages/nap/src/inc/shim.ts
    - packages/nap/src/inc/sdk.ts
    - packages/nap/src/inc-compat.test.ts
    - packages/sdk/src/relay.ts
key-decisions:
  - "Use raw query splitting plus decodeURIComponent so literal plus remains plus; do not use URLSearchParams."
  - "Confine convention URI interpretation to outgoing emit and leave exact receive routing unchanged."
requirements-completed: [CONV-PKG-04]
coverage:
  - id: D1
    description: Queried convention URIs become stable INC topics with shallow decoded text payload maps before postMessage.
    requirement: CONV-PKG-04
    verification:
      - kind: unit
        ref: packages/nap/src/inc-compat.test.ts#emit convention URI transposition
        status: pass
      - kind: other
        ref: pnpm --filter @napplet/nap test:unit -- inc-compat.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Fragments, malformed escapes, duplicate decoded names, and query-plus-payload reject before emission while exact inbound routing remains intact.
    requirement: CONV-PKG-04
    verification:
      - kind: unit
        ref: packages/nap/src/inc-compat.test.ts#rejects a $name before postMessage
        status: pass
      - kind: other
        ref: pnpm -r test:unit
        status: pass
    human_judgment: false
  - id: D3
    description: Core, NAP, and SDK public declarations expose only topic plus optional opaque payload.
    requirement: CONV-PKG-04
    verification:
      - kind: other
        ref: pnpm --filter @napplet/core build && pnpm --filter @napplet/nap build && pnpm --filter @napplet/sdk build && pnpm --filter @napplet/sdk type-check
        status: pass
    human_judgment: false
duration: 5min
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 13: INC Emit Convention URI Transposition Summary

**NAP-INC now clean-breaks to `emit(topic, payload?)`, transposes queried convention URIs into stable wire topics and shallow text payloads, and rejects every ambiguous form before emission.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-23T14:48:37Z
- **Completed:** 2026-07-23T14:53:18Z
- **Tasks:** 2/2
- **Files modified:** 6

## Accomplishments

- Replaced the legacy INC Nostr-event-shaped arguments with topic plus optional opaque payload in core, NAP, and SDK wrappers.
- Added outbound-only convention URI transposition that percent-decodes text once, preserves literal plus, and posts the queryless stable topic.
- Added regression coverage for strict rejection, no value coercion, deprecated IFC alias identity, and unchanged exact receive-side routing.

## Task Commits

1. **Task 1: Trace one convention URI through the clean-break emit API to its wire envelope** - `18e774a3` (test), `d7b70a55` (feat)
2. **Task 2: Enforce the complete rejection matrix and propagate the SDK signature** - `4f485108` (feat)

## Files Created/Modified

- `packages/core/src/types/global/nostr-api.ts` - Declares canonical `IncApi.emit(topic, payload?)`.
- `packages/nap/src/inc/shim.ts` - Transposes only queried convention URIs before posting `inc.emit`.
- `packages/nap/src/inc/sdk.ts` and `packages/sdk/src/relay.ts` - Forward the clean-break payload unchanged.
- `packages/nap/src/inc/types.ts` - Distinguishes developer-facing URI input from stable wire and delivered topics.
- `packages/nap/src/inc-compat.test.ts` - Covers transposition, rejection, plus semantics, no coercion, and exact routing.

## Decisions Made

- Used raw pair splitting and `decodeURIComponent` rather than form decoding, preserving literal `+` exactly as the NAP-INC draft requires.
- Kept all query interpretation in outbound `emit`; subscriptions and inbound events retain direct exact-topic lookup.

## TDD Gate Compliance

- **RED:** `18e774a3` added postMessage and clean-break forwarding assertions; focused INC tests failed against the old API.
- **GREEN:** `d7b70a55` implemented the canonical core/NAP surface and made the focused suite pass.
- **Propagation:** SDK type-check then exposed the stale three-argument delegation; `4f485108` corrected it and added the full rejection matrix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rebuilt the core workspace package before NAP verification**
- **Found during:** Task 1
- **Issue:** NAP type-check resolves `@napplet/core` through its built workspace declaration, which still exposed the old emit signature after the source edit.
- **Fix:** Ran `pnpm --filter @napplet/core build` before the NAP type-check and downstream package verification.
- **Files modified:** None (ignored build output only).
- **Verification:** Core and NAP type-checks pass; subsequent focused and repository gates pass.
- **Committed in:** `d7b70a55`

**Total deviations:** 1 auto-fixed (Rule 3 - Blocking)

## Issues Encountered

- The repository-wide AI-slop scan reports 86/100 from the pre-existing `js-yaml` advisory plus warnings in untouched `service-api.ts`, `topics.ts`, `cvm.ts`, and `nap-types.ts`. These findings are already recorded in the phase deferred-items ledger and do not implicate this plan's files.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The core, NAP, and SDK contracts consistently expose the canonical emit API. Future work can rely on stable outbound wire topics while preserving exact inbound routing.

## Self-Check: PASSED

- Confirmed all six plan-owned source/test files and this summary exist.
- Confirmed task commits `18e774a3`, `d7b70a55`, and `4f485108` exist in git history.
- Confirmed no stubs, unrun plan verification, or threat surface outside the plan threat register.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
