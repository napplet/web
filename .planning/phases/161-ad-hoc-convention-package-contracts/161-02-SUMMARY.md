---
phase: 161-ad-hoc-convention-package-contracts
plan: "02"
subsystem: INC convention topics
tags: [core, nap, inc, conventions, regression-tests]
dependency_graph:
  requires: [161-06]
  provides: [exact INC topic routing coverage, advisory convention topic constants]
  affects: [@napplet/core, @napplet/nap]
tech_stack:
  added: []
  patterns: [opaque topic strings, direct Map-key dispatch, Vitest boundary smoke coverage]
key_files:
  created: []
  modified:
    - packages/core/src/topics.ts
    - packages/nap/src/inc/types.ts
    - packages/nap/src/inc-compat.test.ts
    - packages/nap/src/boundary-smoke.test.ts
decisions:
  - "Use the pinned napplet:note/open, napplet:profile/open, and napplet:dm/open names as opaque advisory convention values."
  - "Keep exact string identity as the only dispatcher behavior; do not parse queries, prefixes, wildcards, case, or Unicode composition."
metrics:
  duration: 6m
  completed: 2026-07-23
  tasks_completed: 2
  files_modified: 4
status: complete
---

# Phase 161 Plan 02: INC Convention Topic Migration Summary

**INC now publishes the three current advisory open convention names while routing only byte-identical opaque topic strings.**

## Accomplishments

- Added permanent tracer coverage for exact INC delivery, including query, prefix, wildcard-like, case, and Unicode-composition non-match probes.
- Replaced the active open-topic constants with `napplet:note/open`, `napplet:profile/open`, and `napplet:dm/open`.
- Clarified public INC type documentation: topic names and payloads are opaque, and payload validation belongs to each local convention.
- Added boundary smoke coverage that imports the core constants and routes all three exact values through the INC shim.

## Files Created/Modified

- `packages/core/src/topics.ts` — current advisory convention constants and opaque-topic guidance.
- `packages/nap/src/inc/types.ts` — opaque topic/payload JSDoc and local-only payload example.
- `packages/nap/src/inc-compat.test.ts` — exact identity and no-normalization regression coverage.
- `packages/nap/src/boundary-smoke.test.ts` — package-boundary routing coverage for all three constants.

## Decisions Made

- Convention names are complete opaque strings; no query parsing, normalization, wildcard, case-folding, or prefix semantics were introduced.
- The example payload is explicitly local and does not claim a convention payload schema or Nostr event kind.

## Verification

- PASS — `pnpm --filter @napplet/nap test:unit -- inc-compat.test.ts boundary-smoke.test.ts`
- PASS — `pnpm --filter @napplet/core type-check`
- PASS — `pnpm --filter @napplet/nap test:unit`
- PASS — `pnpm --filter @napplet/nap type-check`
- PASS — `pnpm -r test:unit`
- PASS — `pnpm lint` (no lint tasks configured)
- PASS — `git diff --check`
- BLOCKED OUTSIDE PLAN — `pnpm build` and `pnpm type-check` stop in `packages/sdk/src/nap-types.ts:351`, which still imports the removed `IntentContract` from `@napplet/nap/intent`.
- QUALITY NOTE — changed-file `aislop` scored 90/100 because of the pre-existing `js-yaml` high advisory and an unrelated oversized service API file; it additionally reports the repository-required topic module header as a style warning.

## TDD Gate Compliance

- RED: `d1fe35d9` added the convention constant/boundary test and failed against the prior topic set.
- GREEN: `55809090` added the three constants and opaque documentation; the package checks pass.
- REFACTOR: `a8bf8cc7` simplified the module header without behavioral change.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rebuilt the core package before NAP boundary tests**
- **Found during:** Task 2 verification
- **Issue:** NAP tests resolve `@napplet/core` through its built workspace entrypoint, which still contained the prior constants after source-only changes.
- **Fix:** Ran `pnpm --filter @napplet/core build` before the NAP test/type-check commands.
- **Files modified:** None (generated build output is ignored).
- **Verification:** All NAP unit tests and type checks passed.

**Total deviations:** 1 auto-fixed blocking verification prerequisite.

## Deferred Issues

- The full repository build and type-check are blocked by the stale SDK `IntentContract` import documented in `deferred-items.md`. This pre-existing Phase 161 migration gap is outside the files and contract owned by 161-02.

## Self-Check: PASSED

- Confirmed all four implementation/test files exist.
- Confirmed task commits `a25ac21f`, `d1fe35d9`, `55809090`, and `a8bf8cc7` exist.
