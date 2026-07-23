---
phase: 161-ad-hoc-convention-package-contracts
plan: "19"
subsystem: runtime-injection
tags: [nap-intent, runtime-shim, delivery, postmessage, vitest]
requires:
  - phase: 161-17
    provides: carrier-neutral intent delivery handler
provides:
  - Intent-only injected globals expose onDelivery
  - Authenticated parent-carried intent deliveries reach target listeners without INC
affects: [runtime-injection, conformance, intent-sdk]
tech-stack:
  added: []
  patterns:
    - Keep intent delivery on the existing authenticated parent postMessage router.
key-files:
  created: []
  modified:
    - packages/shim/src/runtime.ts
    - packages/shim/src/shell.test.ts
key-decisions:
  - "Intent delivery reuses the authenticated intent prefix router and does not introduce an INC bridge."
requirements-completed: [CONV-PKG-01]
coverage:
  - id: D1
    description: An intent-only injected global exposes the adopted intent API and receives a parent-carried no-ID delivery without INC.
    requirement: CONV-PKG-01
    verification:
      - kind: unit
        ref: packages/shim/src/shell.test.ts#delivers intent pushes through the authenticated parent path without INC
        status: pass
      - kind: other
        ref: pnpm --filter @napplet/shim build && pnpm --filter @napplet/shim type-check
        status: pass
    human_judgment: false
metrics:
  duration: 2min
  completed: 2026-07-23
status: complete
---

# Phase 161 Plan 19: Runtime Intent Delivery Injection Summary

**The runtime-injected intent domain now exposes `onDelivery` and receives authenticated parent-carried intent deliveries independently of INC.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-23T15:58:00Z
- **Completed:** 2026-07-23T16:00:07Z
- **Tasks:** 1/1
- **Files modified:** 2

## Accomplishments

- Wired the NAP intent shim's `onDelivery` function into the selected `window.napplet.intent` domain.
- Kept `intent.deliver` on the existing `event.source === window.parent` guarded router, with no new carrier or INC dependency.
- Added TDD coverage that installs only the intent domain, asserts the complete adopted API, and receives a no-ID target delivery.

## Task Commits

1. **Task 1: Inject onDelivery and route one push without INC** - `9f08fd79` (RED test), `9a5b5841` (feat), `8e770d99` (isolated-domain regression)

## Files Created/Modified

- `packages/shim/src/runtime.ts` - Exposes `intentOnDelivery` in the injected intent API.
- `packages/shim/src/shell.test.ts` - Proves intent-only, parent-authenticated delivery routing without INC.

## Decisions Made

- Reused the existing authenticated parent-message path and `intent.` prefix router; the runtime remains a thin carrier rather than adding lifecycle or bridge behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored generated NAP declaration artifacts before the shim gate.**

- **Found during:** Task 1 verification
- **Issue:** A concurrent NAP build had cleared local `@napplet/nap` declaration artifacts, causing shim declaration bundling to fail for every NAP subpath.
- **Fix:** Rebuilt `@napplet/nap` locally, then reran the full shim verification gate.
- **Files modified:** No tracked source files; generated ignored `packages/nap/dist` artifacts only.
- **Verification:** `pnpm --filter @napplet/nap build`, followed by all shim unit, build, and type-check gates.
- **Committed in:** Not applicable - generated artifacts are ignored.

**Total deviations:** 1 auto-fixed (1 blocking build-order issue).

## TDD Gate Compliance

- RED: `packages/shim/src/shell.test.ts` failed as expected because the injected intent API lacked `onDelivery` (`9f08fd79`).
- GREEN: Runtime wiring made the selected-domain delivery test and full shim gate pass (`9a5b5841`).
- Follow-up: the regression imports the runtime entrypoint directly, preventing the root auto-installer from pre-installing INC (`8e770d99`).

## Issues Encountered

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The browser injection layer now carries carrier-neutral intent delivery into the existing authenticated parent path.
- Documentation and release work can rely on the selected intent global exposing the full adopted API.

## Self-Check: PASSED

- Confirmed `packages/shim/src/runtime.ts` and `packages/shim/src/shell.test.ts` exist.
- Confirmed task commits `9f08fd79`, `9a5b5841`, and `8e770d99` exist in git history.
- Confirmed `@napplet/nap` exports `onDelivery` declarations and the generated shim bundle wires the method.
- Confirmed `pnpm --filter @napplet/shim test:unit`, `build`, and `type-check` all pass.
