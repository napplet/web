---
phase: 161-ad-hoc-convention-package-contracts
plan: "11"
subsystem: author-documentation
tags: [nap-inc, convention-uri, vitepress, tutorials, nap-intent]
requires:
  - phase: 161-01
    provides: Current NAP-INTENT convention fields and opaque metadata boundary.
  - phase: 161-03
    provides: CLI slug:convention parsing and three-element archetype metadata emission.
  - phase: 161-13
    provides: INC emit-only convention-URI transposition with exact receive routing.
  - phase: 161-14
    provides: Package and skill guidance plus the scoped convention contract guard.
provides:
  - Convention-current VitePress guides and NAP index reference material.
  - Aligned Note Drafts tutorials using opaque CLI convention metadata.
  - Pinned NAP-INC PR #89 guidance for emit-only query transposition.
affects: [apps-docs, tutorial-harness, convention-contract-guard, package-reference-docs]
tech-stack:
  added: []
  patterns:
    - Link exact upstream draft revisions for protocol-facing guidance and keep local prose non-normative.
    - Teach queried convention URIs only as emit input, followed by stable exact-topic routing.
key-files:
  created: []
  modified:
    - apps/docs/guide/getting-started.md
    - apps/docs/guide/concepts.md
    - apps/docs/guide/index.md
    - apps/docs/guide/nip-5d.md
    - apps/docs/naps/index.md
    - apps/docs/guide/build-note-drafts-napplet.md
    - apps/docs/guide/build-note-drafts-napplet-from-boilerplate.md
    - apps/docs/guide/build-note-drafts-napplet-with-ai-agent-and-skills.md
key-decisions:
  - "Document CLI archetype input as opaque slug:convention metadata and show the emitted three-element archetype tag."
  - "Limit URI query transposition to emit(topic, payload?), preserving exact stable-topic subscriptions and local payload semantics."
  - "Keep NAP-INTENT and manifest convention values opaque and cite NAP-INC at PR #89's exact draft head."
requirements-completed: [CONV-PKG-05]
coverage:
  - id: D1
    description: Core guides and NAP index teach current opaque conventions, emit-only URI transposition, and exact stable-topic routing.
    requirement: CONV-PKG-05
    verification:
      - kind: other
        ref: pnpm --filter @napplet/docs build && pnpm test:convention-contracts
        status: pass
    human_judgment: false
  - id: D2
    description: All maintained Note Drafts tutorials use current CLI archetype metadata and preserve the shared convention boundary.
    requirement: CONV-PKG-05
    verification:
      - kind: integration
        ref: pnpm test:tutorial
        status: pass
      - kind: other
        ref: pnpm --filter @napplet/docs build && pnpm test:convention-contracts
        status: pass
    human_judgment: false
duration: 3min
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 11: Convention-Current Guide and Tutorial Summary

**Active VitePress guides, the NAP index, and every Note Drafts tutorial now use opaque convention metadata and describe NAP-INC URI query transposition only at `emit(topic, payload?)` before exact stable-topic routing.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-23T15:04:51Z
- **Completed:** 2026-07-23T15:07:48Z
- **Tasks:** 2/2
- **Files modified:** 8

## Accomplishments

- Updated getting-started, concepts, overview, NIP-5D, and NAP-index pages with `slug:convention` CLI examples, opaque convention guidance, and the exact NAP-INC PR #89 source link.
- Replaced all Note Drafts `note:NAP-4` metadata examples with `note:napplet:note/open` and documented the tested three-element manifest tag.
- Kept query interpretation confined to outgoing INC `emit`, with shallow text payload transposition, stable queryless subscriptions, and exact routing afterward.

## Task Commits

1. **Task 1: Update concepts, getting-started, and NAP boundary guides** - `47204196` (docs)
2. **Task 2: Update all Note Drafts tutorial paths** - `7bfb906b` (docs)

## Files Created/Modified

- `apps/docs/guide/{getting-started,concepts,index,nip-5d}.md` - Align public authoring guidance with opaque conventions and the emit-only NAP-INC boundary.
- `apps/docs/naps/index.md` - Replaces legacy INC tag/event examples with the stable convention-URI emit and exact subscription example.
- `apps/docs/guide/build-note-drafts-napplet*.md` - Keeps all from-scratch, boilerplate, and agent-assisted tutorials behaviorally aligned.

## Decisions Made

- Use the CLI's tested `note:napplet:note/open` input form and state the corresponding `['archetype', 'note', 'napplet:note/open']` metadata rather than retaining numbered NAP guidance.
- Treat every payload meaning as local: the documentation teaches only the generic shallow text query transposition adopted by NAP-INC.
- Cite the exact `34ec29fc4039384a83dbd6b476f83c4fa0d038e6` NAP-INC draft, retaining NIP-5D and other unrelated protocol explanations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ran the plan-wide convention guard after both documentation tasks**
- **Found during:** Task 1 (Update concepts, getting-started, and NAP boundary guides)
- **Issue:** Task 1's specified full guard scans the three Task 2 tutorial files, which intentionally still contained their legacy numbered examples before Task 2 ran; it therefore could not pass at the tracer boundary.
- **Fix:** Verified the docs build and convention guard self-tests for Task 1, confirmed the live scanner reported only the pending Task 2 files, then ran the full `pnpm test:convention-contracts` successfully after Task 2 completed.
- **Files modified:** None beyond planned documentation files.
- **Verification:** `pnpm test:tutorial`, `pnpm --filter @napplet/docs build`, and `pnpm test:convention-contracts` pass after the complete sweep.
- **Committed in:** `7bfb906b`

**Total deviations:** 1 auto-fixed (Rule 3 - Blocking)

**Impact on plan:** Verification ordering changed only because the planned guard spans both tasks; the delivered documentation scope and final verification are unchanged.

## Issues Encountered

- The repository-wide AI-slop scan remains 86/100 from the pre-existing `js-yaml` advisory and warnings in untouched core/SDK files. These findings are already tracked in the phase deferred-items ledger and do not involve this plan's files.
- Plan 12 package-reference documentation edits were concurrently present in the worktree. They were not staged or modified by this plan.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Active guide and tutorial surfaces now agree on the current convention boundary. Package-reference documentation can complete independently in Plan 12 without revisiting these tutorial paths.

## Self-Check: PASSED

- Confirmed all eight plan-owned guide, tutorial, and NAP-index files and this summary exist.
- Confirmed task commits `47204196` and `7bfb906b` exist in git history.
- Confirmed no stubs, unexpected deletions, or unrun final plan verification; all plan-owned authoring prose links the exact NAP-INC draft head.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
