---
phase: 161-ad-hoc-convention-package-contracts
plan: "05"
subsystem: conformance
tags: [conformance, nap-intent, envelope-validation, manifest-validation]
requires:
  - phase: 161-01
    provides: convention-only NAP-INTENT public types
  - phase: 161-06
    provides: active conformance package baseline
provides:
  - Reference intent availability data using opaque convention names
  - Regression coverage for convention-agnostic envelope validation
affects: [conformance fixtures, NAP-INTENT consumers]
tech-stack:
  added: []
  patterns:
    - Carrier validators check envelope structure while convention payloads remain opaque.
key-files:
  created: []
  modified:
    - packages/conformance/src/shell/reference-shell.ts
    - packages/conformance/src/shell/reference-shell.test.ts
    - packages/conformance/src/validators/envelope.test.ts
key-decisions:
  - "Reference shell advertises napplet:note/open only as a candidate convention, never as a constraint schema."
  - "Envelope validation continues to require only the intent.invoke carrier request object and does not parse convention or payload values."
patterns-established:
  - "Keep conformance fixtures descriptive of current upstream intent fields without treating them as normative authorization or payload rules."
requirements-completed: [CONV-PKG-05]
coverage:
  - id: D1
    description: Reference shell returns convention-only intent availability metadata.
    requirement: CONV-PKG-05
    verification:
      - kind: unit
        ref: packages/conformance/src/shell/reference-shell.test.ts#advertises the reference intent handler through an opaque convention
        status: pass
    human_judgment: false
  - id: D2
    description: Intent envelope validation accepts opaque convention and payload values while rejecting malformed request carriers.
    requirement: CONV-PKG-05
    verification:
      - kind: unit
        ref: packages/conformance/src/validators/envelope.test.ts#accepts opaque intent convention and payload values
        status: pass
      - kind: other
        ref: pnpm --filter @napplet/conformance build && pnpm --filter @napplet/conformance type-check
        status: pass
    human_judgment: false
duration: 3 min
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 05: Convention-Agnostic Conformance Summary

**Reference intent discovery now advertises `napplet:note/open`, while conformance validates only intent envelope carriers and leaves convention payload semantics opaque.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-23T14:06:14Z
- **Completed:** 2026-07-23T14:09:22Z
- **Tasks:** 3/3
- **Files modified:** 3

## Accomplishments

- Updated the reference `intent.available.result` fixture and exact-response regression to use the current `conventions` field without a contract constraint collection.
- Added carrier-level coverage showing `intent.invoke` accepts arbitrary convention and payload values but rejects a malformed `request` carrier.
- Audited active boot, public exports, and manifest validation; no retired intent-contract wording, exports, or validator branches were present to change.

## Task Commits

1. **Task 1: Return a real convention-only intent availability response** - `84fbefc8` (test), `48ea5755` (feat)
2. **Task 2: Keep envelope and manifest validation convention-agnostic** - `5798c912` (test)
3. **Task 3: Audit boot and public conformance exports for retired vocabulary** - verification-only; no code change was needed

## Files Created/Modified

- `packages/conformance/src/shell/reference-shell.ts` - Emits candidate conventions in the reference availability response.
- `packages/conformance/src/shell/reference-shell.test.ts` - Pins the convention-only response shape.
- `packages/conformance/src/validators/envelope.test.ts` - Covers opaque intent convention/payload carriers and malformed request rejection.

## Decisions Made

- Kept convention and payload data opaque to the envelope validator, matching NAP-INTENT's carrier-versus-convention boundary.
- Preserved boot, manifest-event identity, runtime injection, and public exports because the audit found no retired intent-contract surface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test assertion] Corrected the malformed request expectation**
- **Found during:** Task 2
- **Issue:** The new test expected an `expected` property that the validator's established error object does not expose.
- **Fix:** Asserted the stable error code and field instead.
- **Files modified:** `packages/conformance/src/validators/envelope.test.ts`
- **Verification:** Targeted envelope unit suite and conformance type-check pass.
- **Committed in:** `5798c912`

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Test-only correction; no protocol or runtime behavior changed.

## Issues Encountered

Task 2's regression initially passed before any production edit, confirming the existing validator already enforced the intended convention-agnostic carrier boundary. The task therefore required coverage only; no validator or manifest change was justified.

## Known Stubs

None. The existing reference blob URL is an intentional canned test fixture, not a user-facing or unwired data stub.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Conformance fixtures and validator coverage are aligned with the current NAP-INTENT convention model. Later phase work can rely on this package not imposing local convention, payload, query, or constraint semantics.

## Self-Check: PASSED

- Confirmed all three plan-modified source/test files and this summary exist.
- Confirmed task commits `84fbefc8`, `48ea5755`, and `5798c912` exist in git history.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
