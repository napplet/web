---
phase: 161-ad-hoc-convention-package-contracts
plan: "04"
subsystem: cli
tags: [deno, typescript, cli, nip-5a, archetypes, conventions]
requires:
  - phase: 161-03
    provides: opaque convention-only Vite archetype metadata
provides:
  - Convention-only CLI config parsing and persisted metadata
  - Exact three-element CLI archetype manifest tag emission
  - Convention terminology across CLI flags, prompts, exports, and output
affects: [cli, manifest-metadata, deployment, authoring]
tech-stack:
  added: []
  patterns: [centralized opaque convention parsing, exact three-element archetype tags]
key-files:
  created: []
  modified:
    - packages/cli/src/config.ts
    - packages/cli/src/manifest-metadata.ts
    - packages/cli/src/init-wizard.ts
    - packages/cli/src/cli.ts
    - packages/cli/src/output.ts
    - packages/cli/tests/config_test.ts
    - packages/cli/tests/init_wizard_test.ts
    - packages/cli/tests/manifest_test.ts
key-decisions:
  - "Treat convention strings as opaque after documented-form validation; reject only retired numbered NAP identifiers."
  - "Emit and recognize only exact three-element archetype tags, with no event-kind constraints."
patterns-established:
  - "Interactive and non-interactive CLI archetype input both route through parseArchetypeConventions()."
requirements-completed: [CONV-PKG-03]
coverage:
  - id: D1
    description: "CLI config parses and persists opaque archetype conventions while rejecting numbered NAP input."
    requirement: CONV-PKG-03
    verification:
      - kind: unit
        ref: packages/cli/tests/config_test.ts#parseArchetypeConventions preserves opaque convention strings and rejects numbered input
        status: pass
    human_judgment: false
  - id: D2
    description: "CLI manifest metadata emits exact three-element convention tags and omits retired event-kind constraints."
    requirement: CONV-PKG-03
    verification:
      - kind: unit
        ref: packages/cli/tests/manifest_test.ts#config metadata overrides template metadata with exact convention archetype tags
        status: pass
    human_judgment: false
  - id: D3
    description: "Interactive wizard and non-interactive flags produce the same convention config through the shared parser."
    requirement: CONV-PKG-03
    verification:
      - kind: unit
        ref: packages/cli/tests/init_wizard_test.ts#promptInitWizard fills missing fields with URL autocomplete
        status: pass
      - kind: other
        ref: deno task --config packages/cli/deno.json check
        status: pass
    human_judgment: false
duration: 6min
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 04: CLI Convention Metadata Summary

**Deno CLI configuration, manifest emission, and author prompts now carry opaque `napplet:<archetype>/<intent>` conventions without retired numbered-NAP or event-kind metadata.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-23T13:56:49Z
- **Completed:** 2026-07-23T14:02:36Z
- **Tasks:** 3/3
- **Files modified:** 10

## Accomplishments

- Preserved a centralized config boundary for slug plus opaque convention input, including numbered-NAP rejection.
- Emitted and read only exact `archetype`, slug, convention tags; retired constraint metadata cannot enter CLI manifests.
- Routed wizard and `--archetype` inputs through the shared parser and updated help, package documentation, and init output.

## Task Commits

Each task was committed atomically:

1. **Task 1: Trace one CLI convention from parsing into persisted config** - `c3c85ee6` (test), `2e45644b` (feat)
2. **Task 2: Emit truthful CLI archetype metadata** - `36821a3f` (test), `3113b604` (feat)
3. **Task 3: Carry convention terminology through prompts, commands, and output** - `031df135` (test), `4b295fe5` (feat)

## Files Created/Modified

- `packages/cli/src/types.ts` - Defines the convention-only CLI metadata model.
- `packages/cli/src/config.ts` - Normalizes and parses opaque archetype conventions.
- `packages/cli/src/manifest-metadata.ts` - Merges and emits exact convention-only archetype tags.
- `packages/cli/src/init-wizard.ts` - Prompts for convention inputs through the shared parser.
- `packages/cli/src/cli.ts` - Routes non-interactive flags and help text through convention terminology.
- `packages/cli/src/mod.ts` and `packages/cli/src/output.ts` - Export and display the convention contract.
- `packages/cli/tests/config_test.ts`, `packages/cli/tests/init_wizard_test.ts`, and `packages/cli/tests/manifest_test.ts` - Cover config, wizard, output-shape, and negative legacy cases.

## Decisions Made

- Kept only boundary whitespace handling and documented-form validation; no aliases, query parsing, normalization, or convention payload semantics were added.
- Preserved unrelated URL-protocol validation and Nostr manifest event-kind output, while removing event-kind constraints only from archetype tags.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Task 2's first full check exposed the expected still-unmigrated Task 3 consumers. After Task 3 migrated those consumers, the complete CLI Deno suite and check passed.
- The repository-wide AI-slop scan remains 90/100 because of pre-existing `js-yaml`, core file-size, and core-comment findings outside this plan's files; they are recorded in `deferred-items.md`.

## Verification

- `deno task --config packages/cli/deno.json test:unit` — passed (114 tests).
- `deno task --config packages/cli/deno.json check` — passed.
- Plan-scope retired-surface scan and `git diff --check HEAD~5..HEAD` — passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The CLI now matches the convention-only metadata producers and is ready for subsequent contract migration plans.

## Self-Check: PASSED

- Confirmed all ten plan files and the summary exist.
- Confirmed all six TDD task commits exist in git history.
- Confirmed no plan-scope stub markers remain.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
