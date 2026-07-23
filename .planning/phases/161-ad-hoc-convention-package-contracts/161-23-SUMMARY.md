---
phase: 161-ad-hoc-convention-package-contracts
plan: "23"
subsystem: package-documentation
tags: [readme, nap-intent, manifest, event-kinds, conformance]
requires:
  - phase: 161-18
    provides: URI-shaped intent facades and target delivery listeners.
  - phase: 161-22
    provides: authenticated reference-shell acceptance and delivery behavior.
provides:
  - Runtime-package guidance for URI acceptance and target-only intent delivery.
  - Tooling guidance for queryless per-tag contracts and optional event-kind metadata.
affects: [package-docs, manifest-tooling, conformance, boilerplate]
tech-stack:
  added: []
  patterns:
    - Published documentation defers protocol semantics to the three adopted draft heads.
    - Manifest examples use one queryless convention object per archetype tag.
key-files:
  created: []
  modified:
    - README.md
    - packages/core/README.md
    - packages/nap/README.md
    - packages/sdk/README.md
    - packages/shim/README.md
    - packages/vite-plugin/README.md
    - packages/cli/README.md
    - packages/conformance/README.md
    - packages/conformance-cli/README.md
    - packages/boilerplate/README.md
key-decisions:
  - "Keep CLI flag and wizard input convention-only; document optional eventKinds only in object-shaped metadata."
  - "Describe intent acceptance and target delivery as separate carrier events without lifecycle guarantees or public INC coupling."
requirements-completed: [CONV-PKG-05]
coverage:
  - id: D1
    description: Runtime-package README guidance reflects URI acceptance, target delivery, and attested sender boundaries.
    requirement: CONV-PKG-05
    verification:
      - kind: other
        ref: pnpm --filter @napplet/core build && pnpm --filter @napplet/nap build && pnpm --filter @napplet/sdk build && pnpm --filter @napplet/shim build
        status: pass
    human_judgment: false
  - id: D2
    description: Tooling and generator README guidance reflects queryless contracts with optional same-tag event kinds.
    requirement: CONV-PKG-05
    verification:
      - kind: other
        ref: pnpm --filter @napplet/vite-plugin build && pnpm --filter @napplet/cli build && pnpm --filter @napplet/conformance build
        status: pass
    human_judgment: false
metrics:
  tasks_completed: 2
  files_modified: 10
  duration: 11m
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 23: Package Contract Documentation Summary

**All active package READMEs now distinguish accepted URI intent delivery from target receipt and describe queryless manifest contracts with optional same-tag event-kind metadata.**

## Performance

- **Duration:** 11m
- **Started:** 2026-07-23T16:24:21Z
- **Completed:** 2026-07-23T16:35:54Z
- **Tasks:** 2/2
- **Files modified:** 10

## Accomplishments

- Updated root, core, NAP, SDK, and shim references with URI invoke/open examples, target-startup `onDelivery`, runtime-attested sender provenance, untrusted payload treatment, and explicit absence of a public NAP-INC dependency.
- Preserved exact INC subscription routing while restricting URI normalization to its adopted input boundaries and documenting queryless discovery contracts with optional `eventKinds`.
- Updated Vite, CLI, conformance, conformance CLI, and boilerplate references to emit or preserve optional same-tag `kind:<number>` metadata without adding a kinds flag, delimiter, payload schema, or kind inference.

## Task Commits

1. **Task 1: Align root and runtime-package intent guidance** — `2dd9079d` (`docs`)
2. **Task 2: Align tooling, conformance, and generator READMEs** — `46a1bf05` (`docs`)

## Files Created/Modified

- `README.md` — explains the acceptance-to-delivery boundary for package consumers.
- `packages/{core,nap,sdk,shim}/README.md` — documents public intent APIs and carrier boundaries.
- `packages/{vite-plugin,cli,conformance,conformance-cli,boilerplate}/README.md` — documents queryless manifest contracts and optional same-tag kinds.

## Decisions Made

- Kept public CLI input convention-only; `eventKinds` remains object metadata, with no invented flag or delimiter.
- Kept documentation non-normative and linked each active surface to adopted NAP-INC #89, URI terminology #90, and NAP-INTENT #91 revisions.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The repository-wide AI-slop scan remains 68/100 due to pre-existing complexity findings and `js-yaml` / `postcss` advisories outside this plan's files. No plan-owned finding was reported.

## Known Stubs

None.

## Next Phase Readiness

Package and tooling documentation now matches the adopted intent/manifest contract. Phase orchestration can update shared planning state without touching unrelated concurrent work.

## Self-Check: PASSED

- Confirmed all ten plan-owned README files and this summary exist.
- Confirmed task commits `2dd9079d` and `46a1bf05` exist in git history.
- Confirmed no plan-blocking stubs, unexpected deletions, or unrun verification remain.
