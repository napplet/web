---
phase: 161-ad-hoc-convention-package-contracts
plan: "17"
subsystem: intent-runtime
tags: [nap-intent, convention-uri, delivery, fifo, vitest]
requires:
  - phase: 161-15
    provides: shared convention URI normalization
  - phase: 161-16
    provides: URI-derived core intent and delivery types
provides:
  - URI-normalized intent invoke/open wire requests
  - Immediate acceptance results separate from target delivery
  - Carrier-neutral FIFO intent delivery retention
affects: [161-18, 161-19, 161-22, intent-sdk, runtime-injection]
tech-stack:
  added: []
  patterns:
    - Normalize authoritative convention URIs before allocating request correlation IDs.
    - Retain no-ID target deliveries internally until the first listener registers.
key-files:
  created: []
  modified:
    - packages/nap/src/intent/types.ts
    - packages/nap/src/intent/shim.ts
    - packages/nap/src/intent/shim.test.ts
    - packages/nap/src/boundary-smoke.test.ts
key-decisions:
  - "The URI is the only source of normalized intent identity; caller-supplied sender is rejected."
  - "Target delivery strips unexpected carrier fields and exposes no public identifier."
requirements-completed: [CONV-PKG-01]
coverage:
  - id: D1
    description: URI-shaped intent invocation emits a queryless request and resolves immediate acceptance.
    requirement: CONV-PKG-01
    verification:
      - kind: unit
        ref: packages/nap/src/intent/shim.test.ts#derives identity and text payload from the authoritative URI before invoking
        status: pass
    human_judgment: false
  - id: D2
    description: Early and live carrier-neutral target deliveries are retained, delivered, and cleaned up without INC.
    requirement: CONV-PKG-01
    verification:
      - kind: unit
        ref: packages/nap/src/intent/shim.test.ts#retains early target deliveries and drains them once in FIFO order
        status: pass
      - kind: unit
        ref: packages/nap/src/boundary-smoke.test.ts#routes carrier-neutral intent delivery without using INC
        status: pass
    human_judgment: false
metrics:
  duration: 5min
  completed: 2026-07-23
status: complete
---

# Phase 161 Plan 17: Authoritative Intent Delivery Summary

**URI-derived intent requests now resolve immediate runtime acceptance independently from lossless, carrier-neutral target deliveries.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-23T15:52:00Z
- **Completed:** 2026-07-23T15:56:23Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- Normalized `invoke()` and `open()` requests from their convention URI before assigning a correlation ID or posting a wire envelope.
- Replaced handled/window lifecycle result fields with accepted or pre-acceptance-rejected results, and added inbound-only `intent.deliver`.
- Retained every valid early delivery in an internal FIFO and drained it once to the first `onDelivery` handler without relying on INC.

## Task Commits

1. **Task 1: Trace an authoritative URI to an accepted result** — `3e0d509a` (test), `418b477b` (feat)
2. **Task 2: Retain and deliver every early no-ID push in FIFO order** — `5c1c4f6f` (test), `3387b574` (docs)

## Files Created/Modified

- `packages/nap/src/intent/types.ts` — Core-aligned intent aliases and the inbound-only no-ID delivery envelope.
- `packages/nap/src/intent/shim.ts` — URI normalization, acceptance correlation, delivery listener, and retained FIFO.
- `packages/nap/src/intent/shim.test.ts` — URI, acceptance, sender, FIFO, and cleanup coverage.
- `packages/nap/src/boundary-smoke.test.ts` — Carrier-neutral delivery coverage without INC participation.

## Decisions Made

- The binding rejects caller-supplied `sender` and conflicting normalized identity, then emits only URI-derived queryless identity fields.
- Incoming carriers are reduced to the public `IntentDelivery` shape so request, delivery, handling, and window identifiers are not exposed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Protocol fidelity] Removed stale lifecycle and opaque-convention module claims.**

- **Found during:** Task 2
- **Issue:** The intent types module header still described shell window lifecycle and opaque conventions, conflicting with URI-derived identity and independent delivery.
- **Fix:** Rewrote the header around authoritative URI normalization, query payload sugar, and runtime-attested carrier-neutral delivery.
- **Files modified:** `packages/nap/src/intent/types.ts`
- **Committed in:** `3387b574`

**Total deviations:** 1 auto-fixed (1 protocol fidelity).

## TDD Gate Compliance

- Task 1 red coverage failed as expected before implementation (`3e0d509a`).
- Task 2’s regression coverage passed immediately because delivery retention was implemented alongside the Task 1 inbound carrier work; the tests were still committed separately in `5c1c4f6f` to lock the behavior.

## Issues Encountered

- `pnpm --filter @napplet/nap build` and `type-check` remain temporarily blocked by the Plan 161-18-owned `packages/nap/src/intent/sdk.ts` facade, which still calls the retired object-form `invoke`/`open` signatures. The focused intent and boundary suite passed (157 tests); Plan 161-18 must update the facade before rerunning package build/type gates.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 161-18 can propagate the URI-shaped shim API through the NAP SDK facade and barrel exports.
- Plan 161-22 can consume the `intent.deliver` discriminant and no-ID delivery shape for conformance coverage.

## Self-Check: PASSED

- Confirmed all four modified source and test files exist.
- Confirmed task commits `3e0d509a`, `418b477b`, `5c1c4f6f`, and `3387b574` exist in git history.
- Confirmed the focused intent and boundary suite passes; recorded the pending Plan 161-18 facade dependency for package build/type-check.
