---
phase: 161-ad-hoc-convention-package-contracts
plan: "06"
subsystem: testing
tags: [node-test, regression-guard, convention-migration]
requires: []
provides:
  - "A path-aware active-surface scanner for retired convention vocabulary"
  - "A root command that runs guard fixtures before the active-tree scan"
affects: [161-ad-hoc-convention-package-contracts, convention-migration]
tech-stack:
  added: []
  patterns:
    - "Explicit active roots and narrow path-aware allowlists protect historical and unrelated protocol text"
key-files:
  created:
    - scripts/test-convention-contracts.mjs
    - scripts/test-convention-contracts.test.mjs
  modified:
    - package.json
key-decisions:
  - "Keep convention values opaque strings; the guard detects only retired vocabulary, without normalizing replacement values."
  - "Run self-tests before the live scan so fixture regressions are distinguishable from expected pre-migration violations."
patterns-established:
  - "Active-surface guards enumerate roots, avoid symlink traversal, and use tested exact exclusions."
requirements-completed: [CONV-PKG-05, CONV-PKG-06]
coverage:
  - id: D1
    description: "Path-aware convention-contract scanner with fail-first, exclusion, and legitimate-use fixtures"
    requirement: CONV-PKG-05
    verification:
      - kind: unit
        ref: "scripts/test-convention-contracts.test.mjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Root test:convention-contracts command runs fixtures before the live active-tree gate"
    requirement: CONV-PKG-06
    verification:
      - kind: other
        ref: "pnpm test:convention-contracts (expected red before downstream migration)"
        status: pass
    human_judgment: false
duration: 1min
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 06: Convention Contract Guard Summary

**A deterministic Node guard now protects active convention surfaces while preserving opaque replacement values, historical records, and unrelated protocol vocabulary.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-07-23T13:27:16Z
- **Completed:** 2026-07-23T13:28:19Z
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments

- Added fixture-tested scanning for retired intent-contract, numbered convention, slug-number, and archetype-kind vocabulary across explicit active roots.
- Kept exclusions narrow: changelogs, archived planning, the root skills symlink, unrelated WebRTC/URL/Nostr/workspace fields, and exact rejection tests remain outside the migration gate.
- Added `pnpm test:convention-contracts`, which runs the guard’s tests before enforcing the live active-tree scan without adding dependencies.

## Task Commits

1. **Task 1: Build the active-surface guard with fail-first fixtures** - `904e10ed` (test), `0f8598e1` (feat)
2. **Task 2: Wire the guard into the root verification surface** - `6b845b9d` (chore)

## Files Created/Modified

- `scripts/test-convention-contracts.mjs` - Scans explicit active roots without following symlinks and reports precise retired-vocabulary violations.
- `scripts/test-convention-contracts.test.mjs` - Proves violation, clean, exclusion, and allowlist behavior in isolated fixtures.
- `package.json` - Exposes the combined fixture-and-live-scan command as `test:convention-contracts`.

## Decisions Made

- Preserved the locked opaque-string/no-normalization boundary: this guard identifies legacy surface only and does not constrain the format of current convention strings.
- The live scan intentionally remains red until later Phase 161 migration plans remove the detected active legacy vocabulary; that expected result confirms the gate is armed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

`pnpm test:convention-contracts` exits non-zero on the pre-migration active tree after its five fixture tests pass. This is the planned Wave 0 baseline, not an unrun verification or a scanner failure.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Downstream migration plans can use `pnpm test:convention-contracts` as the single active-surface gate. It will become green only after they remove the remaining active legacy vocabulary without weakening the scanner’s exclusions or opaque-value boundary.

## Self-Check: PASSED

- Confirmed the summary, scanner, fixture tests, and root script exist.
- Confirmed Task 1 RED/GREEN commits `904e10ed` / `0f8598e1` and Task 2 commit `6b845b9d` exist in git history.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
