---
phase: 161-ad-hoc-convention-package-contracts
plan: "25"
subsystem: documentation
tags: [skills, nap-intent, nap-inc, manifest, event-kinds]
requires:
  - phase: 161-18
    provides: URI-authoritative intent facade and carrier-neutral delivery API
  - phase: 161-20
    provides: Vite same-tag event-kind manifest metadata
  - phase: 161-21
    provides: CLI same-tag event-kind metadata preservation
provides:
  - Shipped skill guidance for URI intent invocation and target delivery
  - Queryless archetype discovery guidance with optional same-tag event kinds
  - Packaged-content and canonical root-symlink regression coverage
affects: [documentation, generated-napplets, skills-package]
tech-stack:
  added: []
  patterns: [canonical skills directory, URI-authoritative intent authoring]
key-files:
  created: []
  modified:
    - packages/skills/README.md
    - packages/skills/skills/build-napplet/SKILL.md
    - packages/skills/skills/design-napplet/SKILL.md
    - packages/skills/skills/make-napplet/SKILL.md
    - packages/skills/src/index.test.ts
key-decisions:
  - "Canonical shipped skill files, not the root symlink path, are the only edited source."
  - "Skills teach accepted intent delivery separately from target receipt and lifecycle policy."
  - "Optional event kinds are same-tag discovery metadata and CLI strings remain convention-only."
patterns-established:
  - "Skills register onDelivery at startup and validate payloads by queryless convention identity."
requirements-completed: [CONV-PKG-05]
coverage:
  - id: D1
    description: "Shipped skills teach URI intent calls, early delivery listeners, and runtime-attested sender provenance."
    requirement: CONV-PKG-05
    verification:
      - kind: unit
        ref: "packages/skills/src/index.test.ts#ships canonical URI and discovery guidance from the skills directory"
        status: pass
    human_judgment: false
  - id: D2
    description: "Shipped skills teach queryless same-tag event-kind discovery and verify the root skills mirror."
    requirement: CONV-PKG-05
    verification:
      - kind: unit
        ref: "packages/skills/src/index.test.ts#ships canonical URI and discovery guidance from the skills directory"
        status: pass
      - kind: other
        ref: "test $(readlink skills) = packages/skills/skills"
        status: pass
    human_judgment: false
metrics:
  duration: 6min
  completed: 2026-07-23
status: complete
---

# Phase 161 Plan 25: Canonical Skill Contract Summary

**Canonical Napplet skills now generate URI-authoritative intent calls, no-ID target delivery handling, and queryless same-tag discovery metadata.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-23T15:57:00Z
- **Completed:** 2026-07-23T16:03:21Z
- **Tasks:** 1/1
- **Files modified:** 6

## Accomplishments

- Updated build, design, and end-to-end authoring skills for `invoke(uri, options?)`, `open(uri, options?)`, startup `onDelivery`, acceptance semantics, and runtime-attested sender provenance.
- Updated manifest guidance to keep convention identities queryless while allowing optional `eventKinds` as same-tag `kind:<number>` discovery fields.
- Added packaged-content assertions for the adopted guidance and verified the root `skills/` symlink resolves only to the canonical package directory.

## Task Commits

1. **Task 1: Ship adopted intent and manifest guidance from the canonical skill directory** - `6adaa83b` (test), `8a80e075` (feat)

## Files Created/Modified

- `packages/skills/README.md` - Documents URI intent acceptance, delivery, and same-tag discovery metadata.
- `packages/skills/skills/build-napplet/SKILL.md` - Gives implementation-ready manifest and intent examples.
- `packages/skills/skills/design-napplet/SKILL.md` - Adds contract choices to the build specification guidance.
- `packages/skills/skills/make-napplet/SKILL.md` - Keeps end-to-end orchestration aligned with the adopted contract.
- `packages/skills/src/index.test.ts` - Guards packaged text and root-symlink integrity.

## Decisions Made

- The canonical `packages/skills/skills` directory remains the only authored skill source; the root `skills/` symlink is verified but never edited directly.
- Intent acceptance is documented as runtime responsibility transfer, not target receipt or processing; delivery and source/target lifecycle remain runtime policy.
- Event kinds remain optional, same-tag discovery metadata; no query-bearing manifest identity or CLI-string kind syntax is introduced.

## Verification

- `pnpm --filter @napplet/skills test:unit` — passed (15 tests).
- `pnpm --filter @napplet/skills build` — passed.
- `test "$(readlink skills)" = "packages/skills/skills"` and realpath mirror check — passed.
- Stale public delivery-field scan and `git diff --check HEAD~1 HEAD` — passed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Canonical packaged skills and their regression coverage are ready for final cross-package documentation and guard review.

## Self-Check: PASSED

- Confirmed all five modified package files and this summary exist.
- Confirmed task commits `6adaa83b` and `8a80e075` exist in git history.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
