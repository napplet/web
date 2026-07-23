---
phase: 161-ad-hoc-convention-package-contracts
plan: "03"
subsystem: Vite manifest archetype metadata
tags: [vite-plugin, nip5a, archetype, conventions, regression-tests]
dependency_graph:
  requires: [161-06]
  provides: [opaque convention-only archetype tags, numbered-identifier rejection]
  affects: [@napplet/vite-plugin, signed manifest consumers]
tech_stack:
  added: []
  patterns: [opaque convention strings, exact three-element tag serialization, aggregate-hash exclusion]
key_files:
  created: []
  modified:
    - packages/vite-plugin/src/types.ts
    - packages/vite-plugin/src/manifest.ts
    - packages/vite-plugin/src/index.test.ts
    - packages/vite-plugin/README.md
decisions:
  - "Serialize each archetype as exactly [\"archetype\", slug, convention], with convention retained as an opaque string."
  - "Reject numbered NAP identifiers at the Vite option boundary and emit no event-kind or payload constraints."
  - "Leave multi-convention encoding outside this contract; web#183 semantics were not added."
metrics:
  duration: 2m
  completed: 2026-07-23
  tasks_completed: 1
  files_modified: 4
status: complete
---

# Phase 161 Plan 03: Convention-Only Vite Archetype Metadata Summary

**The Vite manifest producer now signs exactly one opaque convention per archetype tag, with legacy numbered identifiers and invented constraints rejected.**

## Accomplishments

- Added RED coverage for the exact `archetype` tag shape, rejection of numbered identifiers, absence of `kind:<n>` constraints, and aggregate-hash exclusion.
- Replaced the legacy Vite archetype option shape with a convention-only form and retained the producer's existing slug and required-field validation.
- Emitted only `["archetype", slug, convention]` tags; convention strings remain opaque and are not query-parsed, Unicode-normalized, canonicalized, or aggregated.
- Updated the Vite plugin README to match the public configuration contract.

## Files Created/Modified

- `packages/vite-plugin/src/types.ts` — convention-only archetype option types and numbered-identifier rejection.
- `packages/vite-plugin/src/manifest.ts` — exact three-element archetype-tag serialization without constraint emission.
- `packages/vite-plugin/src/index.test.ts` — exact-output, legacy-input, no-constraint, and aggregate-hash regression coverage.
- `packages/vite-plugin/README.md` — current author-facing archetype configuration examples.

## Decisions Made

- A convention is an opaque author value: only already-normalized boundary whitespace is trimmed; no payload or event-kind meaning is inferred.
- The implementation does not introduce an encoding for multiple conventions; the web#183 ambiguity remains explicitly out of scope.
- Archetype metadata remains outside the aggregate-hash path-tag fold.

## Verification

- PASS — `pnpm --filter @napplet/vite-plugin test:unit` (26 tests)
- PASS — `pnpm --filter @napplet/vite-plugin type-check`
- PASS — `pnpm --filter @napplet/vite-plugin build`
- PASS — `git diff --check`

## TDD Gate Compliance

- RED: `30ecf3d0` added failing exact-output and negative convention tests.
- GREEN: `e814bd7e` implemented the convention-only option and manifest serialization; package checks pass.
- REFACTOR: not needed.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- Confirmed all four implementation, test, and README files exist.
- Confirmed task commits `30ecf3d0` and `e814bd7e` exist.
