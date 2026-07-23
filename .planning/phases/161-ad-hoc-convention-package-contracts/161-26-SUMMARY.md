---
phase: 161-ad-hoc-convention-package-contracts
plan: "26"
subsystem: convention-contract-testing
tags: [contract-guard, nap-intent, manifests, node-test]
requires:
  - phase: 161-17
    provides: Adopted NAP-INTENT public contracts.
  - phase: 161-20
    provides: Optional same-tag event-kind manifest metadata.
  - phase: 161-25
    provides: Canonical skill guidance for the adopted intent and manifest contract.
provides:
  - Path-aware active-surface guard for the adopted intent and manifest contract.
  - Fixtures that distinguish stale protocol guidance from valid intent, Nostr, history, and test content.
affects: [release-gates, package-contracts, active-documentation]
tech-stack:
  added: []
  patterns:
    - Scan protocol guidance by intent/manifest context instead of banning generic vocabulary.
    - Exclude historical records and negative test fixtures from active-authoring enforcement.
key-files:
  created: []
  modified:
    - scripts/test-convention-contracts.mjs
    - scripts/test-convention-contracts.test.mjs
key-decisions:
  - "Permit IntentContract, candidate contracts, eventKinds, and optional same-tag kind fields in active surfaces."
  - "Restrict stale-surface checks to intent and archetype metadata contexts so generic handling language and unrelated Nostr kinds remain valid."
requirements-completed: [CONV-PKG-05, CONV-PKG-06]
coverage:
  - id: D1
    description: Active contract scan permits adopted intent/manifest fields and rejects superseded lifecycle, delivery, metadata, coupling, and fixed-tag-shape guidance.
    requirement: CONV-PKG-06
    verification:
      - kind: unit
        ref: scripts/test-convention-contracts.test.mjs
        status: pass
      - kind: other
        ref: pnpm test:convention-contracts
        status: pass
    human_judgment: false
  - id: D2
    description: The live active scan preserves numbered-NAP retirement and INC exact-routing checks without following history, negative tests, or the root skills symlink.
    requirement: CONV-PKG-05
    verification:
      - kind: other
        ref: pnpm test:convention-contracts
        status: pass
    human_judgment: false
metrics:
  duration: 11m
  completed: 2026-07-23
status: complete
---

# Phase 161 Plan 26: Adopted Contract Guard Summary

**The active convention guard now permits adopted intent contracts and same-tag event kinds while rejecting only stale intent lifecycle, delivery, metadata, coupling, and fixed-tag-shape guidance.**

## Performance

- **Duration:** 11m
- **Started:** 2026-07-23T16:38:30Z
- **Completed:** 2026-07-23T16:50:09Z
- **Tasks:** 1/1
- **Files modified:** 2

## Accomplishments

- Replaced the blanket `IntentContract`/`contracts` and archetype-kind bans with path- and content-aware stale-surface families.
- Preserved numbered-NAP retirement and the D-03 INC exact-routing guidance check.
- Added positive, negative, history, symlink, unrelated-Nostr, and multiline metadata fixtures, then passed the live repository scan.

## Task Commits

1. **Task 1: Replace stale guard families with adopted-contract fixtures** — `161d9374` (test), `54677044` (feat), `2deed6e4` (test), `1d056a6f` (fix)

## Files Created/Modified

- `scripts/test-convention-contracts.mjs` — scans only active stale convention surfaces while allowing adopted public contract fields.
- `scripts/test-convention-contracts.test.mjs` — verifies valid, invalid, historical, test-only, and false-positive fixtures.

## Decisions Made

- Kept query-bearing URI detection limited to handler/manifest metadata; URI invocation examples remain valid input-boundary guidance.
- Excluded changelogs, completed summaries, test fixtures, and symlinks from active guidance enforcement rather than maintaining path-specific negative-test exceptions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Detect multiline queried archetype tags**
- **Found during:** Task 1: Replace stale guard families with adopted-contract fixtures
- **Issue:** The initial metadata rule only detected a queried convention when the tag was on one line, leaving multiline manifest tags unguarded.
- **Fix:** Added a failing multiline fixture and a complete archetype-tag pattern.
- **Files modified:** `scripts/test-convention-contracts.mjs`, `scripts/test-convention-contracts.test.mjs`
- **Verification:** `node --test scripts/test-convention-contracts.test.mjs` and `pnpm test:convention-contracts`
- **Committed in:** `2deed6e4`, `1d056a6f`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** The fix completes the planned query-bearing metadata coverage without expanding scan scope.

## Issues Encountered

None.

## Known Stubs

None.

## Next Phase Readiness

The release guard is ready for the remaining Phase 161 work and live repository verification.

## Self-Check: PASSED

- Confirmed both modified scanner files exist.
- Confirmed TDD commits `161d9374`, `54677044`, `2deed6e4`, and `1d056a6f` exist in git history.
- Confirmed the focused test suite and live active scan pass with no stubs or unrun verification.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
