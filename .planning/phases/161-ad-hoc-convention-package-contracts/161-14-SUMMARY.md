---
phase: 161-ad-hoc-convention-package-contracts
plan: "14"
subsystem: authoring-guidance
tags: [nap-inc, convention-uri, documentation, skills, static-guard]
requires:
  - phase: 161-08
    provides: Package-documentation baseline for convention guidance.
  - phase: 161-09
    provides: Canonical napplet authoring skills.
  - phase: 161-13
    provides: Clean-break INC emit API and outbound convention-URI transposition.
provides:
  - Non-normative package guidance for canonical NAP-INC URI query transposition.
  - Canonical authoring skills that distinguish outbound sugar from exact inbound routing.
  - A path- and content-aware guard against stale INC query-denial guidance.
affects: [package-authors, napplet-skills, convention-contract-guard, plans-161-11-12]
tech-stack:
  added: []
  patterns:
    - Keep protocol guidance non-normative and link the exact NAP-INC draft revision.
    - Scope convention scans to active Markdown INC or napplet authoring guidance, not generic query APIs.
key-files:
  created: []
  modified:
    - packages/nap/README.md
    - packages/sdk/README.md
    - packages/shim/README.md
    - packages/skills/skills/build-napplet/SKILL.md
    - packages/skills/skills/design-napplet/SKILL.md
    - packages/skills/skills/make-napplet/SKILL.md
    - packages/skills/README.md
    - packages/skills/src/index.test.ts
    - scripts/test-convention-contracts.mjs
    - scripts/test-convention-contracts.test.mjs
key-decisions:
  - "Teach query transposition only through emit(topic, payload?), keeping subscriptions and receive-side routing on the exact stable topic."
  - "Keep NAP-INTENT and manifest conventions opaque, and cite the exact NAP-INC draft revision instead of restating protocol requirements."
  - "Limit stale-guidance detection to active Markdown INC or napplet authoring text so history, symlinks, and unrelated query APIs remain unaffected."
requirements-completed: [CONV-PKG-04, CONV-PKG-05]
coverage:
  - id: D1
    description: Package READMEs demonstrate canonical INC convention-URI emission, stable wire topics, and the rejection boundary.
    requirement: CONV-PKG-04
    verification:
      - kind: other
        ref: pnpm --filter @napplet/docs build && pnpm --filter @napplet/nap type-check && pnpm --filter @napplet/sdk type-check && pnpm --filter @napplet/shim type-check
        status: pass
    human_judgment: false
  - id: D2
    description: Canonical authoring skills teach emit-only query transposition and exact subscription routing without the superseded web#183 ambiguity.
    requirement: CONV-PKG-04
    verification:
      - kind: unit
        ref: packages/skills/src/index.test.ts#ships canonical INC query-transposition guidance from the skills directory
        status: pass
      - kind: other
        ref: pnpm --filter @napplet/skills test:unit && pnpm --filter @napplet/skills type-check
        status: pass
    human_judgment: false
  - id: D3
    description: The convention guard detects stale blanket INC query-denial prose while allowing canonical query-transposition examples and unrelated query APIs.
    requirement: CONV-PKG-05
    verification:
      - kind: unit
        ref: scripts/test-convention-contracts.test.mjs
        status: pass
    human_judgment: false
duration: 7min
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 14: INC Query-Sugar Authoring Guidance Summary

**Package documentation, canonical napplet skills, and the convention guard now teach NAP-INC convention-URI query transposition through `emit(topic, payload?)` while preserving exact stable-topic routing.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-23T14:56:04Z
- **Completed:** 2026-07-23T15:02:52Z
- **Tasks:** 3/3
- **Files modified:** 10

## Accomplishments

- Updated NAP, SDK, and shim READMEs with the canonical URI-to-wire-envelope example, exact NAP-INC draft link, payload limits, and rejection matrix.
- Replaced superseded query-prohibition guidance in all canonical authoring skills with emit-only transposition, stable queryless subscriptions, and opaque intent/manifest boundaries.
- Added a regression-tested, active-guidance-only scanner family that catches stale blanket INC query denial without policing unrelated query APIs or negative tests.

## Task Commits

1. **Task 1: Document canonical package-level INC query-sugar usage** - `5d9a0901` (docs)
2. **Task 2: Update canonical napplet skills with query-transposition guidance** - `cc602ab1` (test), `84ff9558` (docs)
3. **Task 3: Guard against stale INC query-denial authoring guidance** - `565d0851` (test), `bf49ef1d` (test)

## Files Created/Modified

- `packages/nap/README.md`, `packages/sdk/README.md`, and `packages/shim/README.md` - Explain the runtime's supported convention-URI emit behavior without asserting independent protocol rules.
- `packages/skills/skills/{build,design,make}-napplet/SKILL.md` and `packages/skills/README.md` - Teach the canonical emit, payload, routing, and opaque-metadata boundaries.
- `packages/skills/src/index.test.ts` - Locks the canonical skill wording and removes the superseded `web#183` ambiguity.
- `scripts/test-convention-contracts.mjs` and `scripts/test-convention-contracts.test.mjs` - Add the scoped stale INC query-denial guard and its positive/negative fixtures.

## Decisions Made

- Teach convention-URI queries only at the outgoing `emit(topic, payload?)` boundary; subscribers continue using the stable queryless topic and receive routing stays exact.
- Link the exact NAP-INC draft revision and leave NAP-INTENT/archetype manifests opaque, rather than introducing repo-owned normative wording.
- Restrict the new scanner family to active Markdown authoring guidance that discusses INC or `napplet:` URIs, preserving historical material, the root skill symlink, unrelated query APIs, and intentional negative tests.

## TDD Gate Compliance

- **Skills RED:** `cc602ab1` added the canonical guidance assertions and failed against the superseded skill prose.
- **Skills GREEN:** `84ff9558` updated the canonical skill sources and made the package skill suite pass.
- **Guard RED:** `565d0851` added a stale-denial fixture that failed before the scanner recognized the new family.
- **Guard GREEN:** `bf49ef1d` implemented the scoped detector and made all convention-guard self-tests pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved intentional rejection/type-negative tests in the convention scanner**
- **Found during:** Task 3 (Guard against stale INC query-denial authoring guidance)
- **Issue:** The live scan treated an intentional CLI try/catch rejection test and the intentional removed `IntentContract` type-negative test as authoring violations, conflicting with the plan's required live-scan result of only Plans 11/12 documentation findings.
- **Fix:** Narrowly recognized the existing rejection-test path and explicit removed-type assertion marker, then added regression coverage; the new stale-guidance rule remains restricted to active Markdown INC/napplet guidance.
- **Files modified:** `scripts/test-convention-contracts.mjs`, `scripts/test-convention-contracts.test.mjs`
- **Verification:** `node --test scripts/test-convention-contracts.test.mjs` passes; the live scan reports only the deferred Plans 11/12 guide findings.
- **Committed in:** `bf49ef1d`

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)

**Impact on plan:** The correction is confined to scanner false positives required to make the planned acceptance scan meaningful; it does not broaden enforcement scope.

## Issues Encountered

- The full live convention scan still reports only numbered-convention and slug-number examples in Plan 11/12-owned `apps/docs/guide` files. Per plan scope, these files were neither changed nor allowlisted.
- The repository-wide AI-slop scan remains 86/100 due to the pre-existing `js-yaml` advisory and warnings in untouched core/SDK files. These findings are already recorded in the phase deferred-items ledger and do not involve this plan's files.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Package and skill consumers can rely on a single documented `emit(topic, payload?)` convention-URI path, while the guard prevents the old blanket query-denial guidance from returning. Plans 11/12 retain ownership of their outstanding documentation scanner findings.

## Self-Check: PASSED

- Confirmed all ten plan-owned files and this summary exist.
- Confirmed task commits `5d9a0901`, `cc602ab1`, `84ff9558`, `565d0851`, and `bf49ef1d` exist in git history.
- Confirmed no stubs, unexpected deletions, or unrun plan verification; the only live-scan findings are the explicitly out-of-scope Plan 11/12 documentation entries.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
