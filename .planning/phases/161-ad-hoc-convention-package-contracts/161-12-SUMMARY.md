---
phase: 161-ad-hoc-convention-package-contracts
plan: "12"
subsystem: package-reference-documentation
tags: [documentation, nap-inc, convention-uri, archetype-manifest, vitepress]
requires:
  - phase: 161-01
    provides: Convention-current intent package fields.
  - phase: 161-02
    provides: Exact opaque INC topic routing.
  - phase: 161-03
    provides: Exact CLI archetype convention and manifest-tag output.
  - phase: 161-13
    provides: Clean-break INC emit API and outbound convention-URI transposition.
  - phase: 161-14
    provides: Canonical INC query-transposition authoring guidance and guard coverage.
provides:
  - Package-reference documentation for the canonical CLI convention metadata shape.
  - Package-reference INC guidance that confines URI query transposition to outbound emit.
  - Explicit exact stable-topic routing and opaque NAP-INTENT/manifest boundaries.
affects: [package-authors, docs, nap-inc, cli, sdk, shim]
tech-stack:
  added: []
  patterns:
    - Link the exact NAP-INC draft revision and keep package guidance non-normative.
    - Treat query transposition as emit-only preprocessing; subscriptions route the stable topic exactly.
key-files:
  created:
    - .planning/phases/161-ad-hoc-convention-package-contracts/161-12-SUMMARY.md
  modified:
    - apps/docs/packages/cli.md
    - apps/docs/packages/core.md
    - apps/docs/packages/nap.md
    - apps/docs/packages/sdk.md
    - apps/docs/packages/shim.md
key-decisions:
  - "Document only the CLI's exact three-element archetype tag and preserve opaque convention values."
  - "Teach URI query transposition solely at NAP-INC emit, followed by exact queryless stable-topic routing."
requirements-completed: [CONV-PKG-05]
coverage:
  - id: D1
    description: Five package-reference pages explain current CLI convention metadata and NAP-INC emit-time transposition without extending query behavior to NAP-INTENT or manifests.
    requirement: CONV-PKG-05
    verification:
      - kind: other
        ref: pnpm --filter @napplet/docs build && pnpm test:convention-contracts
        status: pass
    human_judgment: false
duration: 4min
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 12: Package Convention Reference Summary

**Five package-reference pages now document exact CLI archetype tags and NAP-INC's emit-only URI transposition while keeping stable-topic routing, NAP-INTENT, and manifests opaque.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-23T15:05:16Z
- **Completed:** 2026-07-23T15:08:56Z
- **Tasks:** 1/1
- **Files modified:** 5

## Accomplishments

- Replaced the stale CLI `slug:NAP-N` option with the current `slug:napplet:<archetype>/<intent>` shape and showed the exact three-element manifest tag.
- Replaced the legacy three-argument INC example with `emit(topic, payload?)` and documented outbound-only shallow query transposition.
- Made stable queryless subscriptions, exact routing, local payload validation, and opaque NAP-INTENT/manifest conventions explicit, with the exact NAP-INC PR #89 draft-head link.

## Task Commits

1. **Task 1: Update package-reference pages** - `a67ff20d` (docs)

## Files Created/Modified

- `apps/docs/packages/cli.md` - Documents exact CLI convention metadata and manifest tag emission.
- `apps/docs/packages/core.md` - Describes opaque intent conventions and the global INC emit boundary.
- `apps/docs/packages/nap.md` - Documents canonical NAP-INC URI transposition and exact subscription routing.
- `apps/docs/packages/sdk.md` - Uses the clean-break `inc.emit(topic, payload?)` API and stable-topic subscription.
- `apps/docs/packages/shim.md` - Demonstrates runtime-injected INC emission and its transposition boundary.

## Decisions Made

- Linked the exact upstream NAP-INC draft head rather than restating a locally normative protocol rule.
- Kept `pubkey` and all other payload fields explicitly local convention choices, leaving receiver-side validation to consumers.
- Kept NAP-INTENT and manifest convention strings opaque; NAP-INC's emit-time rule does not authorize parsing or query-aware matching elsewhere.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored accurate phase status after metadata update**
- **Found during:** Plan state update
- **Issue:** `state.advance-plan` used the stale twelve-plan counter and marked Phase 161 ready for verification although `161-10-PLAN.md` remains incomplete.
- **Fix:** Restored the executing status and recorded the actual 13-of-14 position with Plan 161-10 as the next work item.
- **Files modified:** `.planning/STATE.md`
- **Verification:** `ROADMAP.md` reports 13/14 executed and leaves only Plan 161-10 unchecked.
- **Committed in:** Plan metadata commit

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)

**Impact on plan:** Preserves correct phase orchestration state; no package documentation scope expanded.

## Issues Encountered

- The repository-wide AI-slop scan remains 86/100 because of the pre-existing `js-yaml` advisory and unrelated source-file warnings recorded in `deferred-items.md`. The plan-owned docs build and convention-contract gates pass, and this plan did not modify any reported file.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Package-reference guidance is synchronized with the implemented clean-break API and the pinned NAP-INC draft; downstream authors can use stable topics without introducing query-aware routing.

## Self-Check: PASSED

- Confirmed all five plan-owned package-reference pages and this summary exist.
- Confirmed task commit `a67ff20d` exists in git history.
- Confirmed no stubs, skipped tests, unrun plan verification, or unregistered threat surface in the plan-owned files.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
