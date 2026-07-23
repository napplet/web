---
phase: 161-ad-hoc-convention-package-contracts
plan: "09"
subsystem: skills
tags: [agent-skills, conventions, nap-intent, nap-inc, vitest]
requires:
  - phase: 161-01
    provides: "Current convention-only NAP-INTENT fields"
  - phase: 161-02
    provides: "Opaque exact INC topic boundary and current examples"
  - phase: 161-03
    provides: "Three-element archetype manifest representation"
provides:
  - "Canonical build, design, and make skill guidance for opaque conventions"
  - "Regression coverage that validates packaged content and the root skills symlink"
affects: [161-07, 161-08, 161-10, authoring-guidance]
tech-stack:
  added: []
  patterns:
    - "Edit packaged skills only; root skills is verified as a symlink mirror"
    - "Keep INC topic names exact and opaque while receiver validation remains local"
key-files:
  created: []
  modified:
    - packages/skills/skills/build-napplet/SKILL.md
    - packages/skills/skills/design-napplet/SKILL.md
    - packages/skills/skills/make-napplet/SKILL.md
    - packages/skills/README.md
    - packages/skills/src/index.test.ts
key-decisions:
  - "Archetype metadata is documented only as [\"archetype\", slug, convention], with no local constraint or negotiation fields."
  - "INC topics remain exact opaque identifiers; web#183 remains an unresolved upstream edge rather than an implementation rule."
  - "The root skills link remains a single canonical package mirror and is checked by test."
patterns-established:
  - "Package skill tests assert shipped canonical text and compare the root symlink's resolved target to skillsRoot()."
requirements-completed: [CONV-PKG-05]
coverage:
  - id: D1
    description: "Shipped build/design/make guidance for opaque conventions, exact three-element archetype tags, and local INC payload validation"
    requirement: CONV-PKG-05
    verification:
      - kind: unit
        ref: "pnpm --filter @napplet/skills test:unit"
        status: pass
      - kind: other
        ref: "pnpm --filter @napplet/skills type-check && pnpm --filter @napplet/skills build"
        status: pass
    human_judgment: false
  - id: D2
    description: "Canonical packaged skills and root symlink mirror regression guard"
    requirement: CONV-PKG-05
    verification:
      - kind: unit
        ref: "packages/skills/src/index.test.ts#ships opaque convention guidance from the canonical skills directory"
        status: pass
      - kind: other
        ref: "test \"$(readlink skills)\" = \"packages/skills/skills\""
        status: pass
    human_judgment: false
duration: 5min
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 09: Canonical Skill Convention Guidance Summary

**The packaged napplet skills now teach opaque convention names, exact archetype tags and INC topics, with an automated guard that the root skills link remains their single mirror.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-23T14:12:07Z
- **Completed:** 2026-07-23T14:17:51Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Updated the build, design, and make skills to use opaque `napplet:<archetype>/<intent>` conventions, exactly `["archetype", slug, convention]` metadata, and the `note`, `profile`, and `dm` upstream examples.
- Made payload guidance explicit: receivers validate untrusted local payloads against a real upstream convention when one exists; no numbered schemas, constraints, query parsing, or multi-convention encoding is added.
- Added a packaged-skill regression test for current markers, retired guidance omissions, and the `skills -> packages/skills/skills` root symlink target.

## Task Commits

1. **Task 1: Update canonical skill guidance** - `36e481cf` (docs)
2. **Task 2: Lock packaged skills and root symlink parity** - `02698826` (test)

## Files Created/Modified

- `packages/skills/skills/build-napplet/SKILL.md` - Current opaque archetype and INC authoring guidance.
- `packages/skills/skills/design-napplet/SKILL.md` - Cross-napplet design requirements and exact metadata/topic boundary.
- `packages/skills/skills/make-napplet/SKILL.md` - End-to-end workflow rules for convention-based handoff.
- `packages/skills/README.md` - Packaged cross-napplet convention reference.
- `packages/skills/src/index.test.ts` - Shipped-content and root-symlink regression coverage.

## Decisions Made

- Preserve the CLI-first scaffold workflow and unrelated NIP-5D/NAP guidance while replacing only retired convention authoring content.
- Refer unresolved query/encoding behavior to web#183 without selecting a matching, normalization, payload, or multi-convention rule.
- Test the canonical package content once through `readSkill()` and confirm the root directory resolves to that canonical source instead of scanning/editing the symlink mirror separately.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test bug] Narrowed the retired kind assertion and imported the canonical skills resolver.**
- **Found during:** Task 2 (Lock packaged skills and root symlink parity)
- **Issue:** The initial broad `kind:` assertion rejected unrelated event-kind examples, and the symlink comparison omitted `skillsRoot` from the test import.
- **Fix:** Assert only the retired `kind:<n>` constraint form and import `skillsRoot` for the canonical resolved-path comparison.
- **Files modified:** `packages/skills/src/index.test.ts`
- **Verification:** `pnpm --filter @napplet/skills test:unit` passes 15 tests.
- **Committed in:** `02698826`

---

**Total deviations:** 1 auto-fixed (Rule 1 test bug)
**Impact on plan:** The regression guard now rejects the retired archetype constraint without blocking unrelated Nostr event-kind guidance.

## Issues Encountered

`pnpm test:convention-contracts` ran its five scanner fixtures successfully but remains red on active CLI/docs/SDK legacy surfaces owned outside this plan. The findings are recorded in `deferred-items.md` for the planned downstream documentation/package sweep; no local guard exception or protocol behavior was added.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Canonical skill content and its root mirror are protected. Plans 161-07 and 161-08 still need to remove their active author documentation findings, and the SDK compatibility export remains outside this plan's file ownership before the phase-wide convention guard can go green.

## Self-Check: PASSED

- Confirmed all five canonical skill/test files exist and the root `skills` path resolves to `packages/skills/skills`.
- Confirmed task commits `36e481cf` and `02698826` exist in git history.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
