---
phase: quick-260904-nm7
plan: 01
subsystem: vite-plugin-packaged-runtime
tags: [vite, blossom, resource-loader, accessibility, playwright]
requires:
  - phase: quick-260904-h0g
    provides: Node transport, Deno upload, and parser-scoped optimizer fixes for issues 212, 213, and 214
  - phase: 162-blossom-backed-large-asset-optimization
    provides: Bounded retained-resource optimizer, signed private resource table, and production deployment path
provides:
  - Immediate accessible loader UI for packaged napplets with honest verified-resource counts
  - Recoverable concurrent resource loading with sibling caching, cancellation, and failed-row retry
  - Atomic application handoff after every startup resource verifies
  - Fail-closed retained production evidence for long Paja loading, retry, cancellation, and accessibility states
affects: [vite-plugin-optimizer, packaged-napplet-startup, phase-162-verification]
tech-stack:
  added: []
  patterns: [terminal-result progress, recoverable aggregate promises, scanner-grounded HTML injection, retained production evidence]
key-files:
  created:
    - packages/vite-plugin/src/optimizer/loader-screen.ts
    - packages/vite-plugin/src/optimizer/loader-runtime.ts
    - packages/vite-plugin/src/optimizer/loader-source.ts
    - packages/vite-plugin/src/optimizer/pipeline-render.ts
    - packages/vite-plugin/src/optimizer/large-fixture-runtime.test.ts
    - scripts/validate-packaged-loader-evidence.mjs
    - scripts/validate-packaged-loader-evidence.test.mjs
    - .changeset/polished-packaged-loader.md
  modified:
    - packages/vite-plugin/src/optimizer/loader.ts
    - packages/vite-plugin/src/optimizer/loader.test.ts
    - packages/vite-plugin/src/optimizer/pipeline.ts
    - packages/vite-plugin/src/optimizer/pipeline.test.ts
    - packages/vite-plugin/src/optimizer/large-fixture-runtime.ts
    - packages/vite-plugin/src/optimizer/large-fixture.ts
    - packages/vite-plugin/src/optimizer/large-fixture.evidence.json
key-decisions:
  - "Count only terminal resources whose Blob length and SHA-256 digest have verified; never infer byte, percentage, rate, chunk, or ETA progress."
  - "Keep the original aggregate promise pending across recoverable failures, cache successful siblings independently, and retry only unresolved rows under fresh AbortControllers."
  - "Treat loader state and markup as private signed-artifact plumbing over canonical NAP-RESOURCE operations, not as new wire protocol."
patterns-established:
  - "Startup-cohort pattern: open on the first unique resource, close after an idle animation frame, and hand off only after the complete observed cohort verifies."
  - "Evidence pattern: retain binary screenshots and trace while independently deriving timestamps, public identities, hashes, and secret absence."
requirements-completed: [QUICK-260904-NM7, LOADER-UX-01, LOADER-UX-02, LOADER-UX-03, LOADER-UX-04, LOADER-UX-05, LOADER-UX-06, LOADER-UX-07, RELEASE-01]
duration: 3h 11m
completed: 2026-09-04
---

# Quick Task 260904-nm7: Improve the Packaged-Napplet Loader UX Summary

**Packaged napplets now remain visibly responsive through long verified-resource loads, recover safely from individual failures or cancellation, and replace the loader with the application only after an atomic completed handoff.**

## Performance

- **Duration:** 3h 11m
- **Started:** 2026-09-04T16:41:01Z
- **Completed:** 2026-09-04T19:52:00Z
- **Tasks:** 3 implementation/evidence tasks plus cleanup and independent gates
- **Files modified:** 37 H1 source/evidence/release files plus 7 H2 planning metadata paths

## Accomplishments

- Added a polished self-contained light/dark loader with semantic indeterminate progress, verified whole-resource counts, safe status text, native controls, visible keyboard focus, 44px targets, and reduced-motion behavior.
- Preserved concurrent/coalesced resource loading while caching successful `bytesMany` siblings independently, keeping aggregate promises recoverable, retrying only unresolved rows, and preserving original result order.
- Kept the loader mounted beyond 35 seconds without a napplet-side deadline and replaced it atomically with the final packaged application after all observed startup resources verified.
- Retained ten Paja screenshots, a replayable trace, public manifest/index/resource identities, and a validator that refetches and recomputes the production proof rather than trusting recorded success flags.
- Opened stacked PR #216 at fixed H1 `a1b6bb0c8b2533e108c6a84d678daa8ee4226ebb`, based on `236d35a4`, which already contains the merged fixes for issues #212, #213, and #214.

## Task Commits

Each behavior change was committed at a green checkpoint with RED coverage first where applicable:

1. **Loader state/runtime:** `e718e718` RED, `16adf0ee` GREEN.
2. **Artifact integration and visual surface:** `e731c35b` RED, `5e4ed8b8` GREEN.
3. **Fail-closed retained evidence:** `f953760c` RED, `e0b43c51` GREEN.
4. **Release metadata:** `0bd53a2a`.
5. **Production-discovered injection boundary:** `ae4936c5` RED, `264beec3` GREEN.
6. **Exact H2 publication boundary:** `5a06e738` RED, `836a2659` GREEN.
7. **Production Paja proof:** `d55c7f67`.
8. **Deterministic mixed-row test synchronization:** `3688b640`.
9. **Quality-gate responsibility splits:** `60adf954`, `c0fd0f15`, `f4fbe31c`, `a1b6bb0c`.

**Plan metadata:** this summary, the final plan/research/validation records, H1 review/verification reports, and project state form the exact metadata-only H2 commit.

## Verification

- Targeted optimizer tests — PASS, 67/67.
- Evidence validator corruption suite — PASS, 58/58.
- `@napplet/vite-plugin` unit suite — PASS, 113/113.
- `pnpm build` — PASS, 14/14 Turbo tasks.
- `pnpm type-check` — PASS, 21/21 Turbo tasks.
- `pnpm -r test:unit` — PASS, including CLI 123/123 and Vite plugin 113/113.
- `pnpm lint` — PASS; the repository currently defines zero Turbo lint tasks.
- `pnpm test` — PASS, 25/25 Turbo tasks plus tutorial conformance.
- `pnpm audit --audit-level high` — PASS, no known vulnerabilities.
- `CI=true pnpm dlx aislop@0.12.0 scan --changes --base origin/feat/vite-plugin-blossom-optimization .` — PASS, 100/100 with zero issues.
- Retained live evidence validator — PASS, 10 screenshots, 10 resources, and a timestamp-derived 35,067 ms active interval.
- Visual verdicts — PASS for all ten local and all ten production comparisons; every recorded score is at least 90.
- Independent H1 code review — PASS at `a1b6bb0c`, zero high and zero medium findings.
- Independent H1 GSD verification — zero failed product requirements; only metadata-only H2 and the final external publication audit were intentionally pending.

## Files Created/Modified

- `packages/vite-plugin/src/optimizer/loader-screen.ts` — deterministic accessible loader markup, styling, and state projection.
- `packages/vite-plugin/src/optimizer/loader-runtime.ts` and `loader-source.ts` — aligned TypeScript and emitted-browser resource lifecycles.
- `packages/vite-plugin/src/optimizer/pipeline-render.ts` — scanner-grounded loader injection and render-only helpers separated from optimizer transactions.
- `packages/vite-plugin/src/optimizer/large-fixture-runtime.test.ts` — browser-like generated-runtime tests for every loader state and atomic handoff.
- `scripts/validate-packaged-loader-evidence.mjs` plus `scripts/lib/packaged-loader-evidence-*.mjs` — modular fail-closed local, timeline, public-byte, identity, secret, and publication checks.
- `.planning/quick/260904-nm7-improve-the-napplet-vite-plugin-packaged/evidence/` — ten PNGs, the raw timeline, and the Playwright trace.
- `.changeset/polished-packaged-loader.md` — patch release note for `@napplet/vite-plugin` only.

## Simplifications Made

- Split loader contracts, stateful runtime, and emitted source behind the existing `loader.ts` barrel without changing public exports or generated behavior.
- Moved rendering helpers out of the optimizer transaction path and fixture service doubles out of evidence orchestration.
- Split the retained validator by timeline, local binary, remote identity, production service, and shared validation responsibilities; every changed/new source file is below 400 lines.
- Removed unused imports and narrative wrapper comments instead of disabling quality rules or adding abstractions/dependencies.

## Decisions Made

- NAP-RESOURCE supplies complete terminal Blobs and AbortSignal cancellation but no streaming progress fields. The UI therefore advances only by verified resource count and makes no byte or percentage claim.
- A mixed bulk result is processed row by row: valid siblings enter cache immediately, failures retain their source identity, and the caller-visible aggregate resolves only after retry completes every row in input order.
- HTML insertion uses actual scanner-located head/body boundaries. Raw-text content, comments, and template lookalikes are never insertion authority.
- The feature remains stacked on the optimizer branch so #212, #213, and #214 stay in ancestry; neither permitted push targets or rewrites that base.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Production correctness] Replaced textual loader insertion with scanner-grounded document boundaries**

- **Found during:** fresh production deployment.
- **Issue:** a literal `</head>` inside JavaScript captured loader metadata and corrupted the preliminary artifact.
- **Fix:** added a failing boundary regression, then ignored comments/raw-text/template contents while locating the actual document tags.
- **Verification:** 67 targeted optimizer tests and the corrected public Paja deployment.
- **Committed in:** `264beec3` after RED `ae4936c5`.

**2. [Rule 1 - Test reliability] Removed scheduler-turn dependence from mixed-row recovery coverage**

- **Found during:** concurrent full-suite execution.
- **Issue:** CPU contention could delay Blob digest completion beyond a fixed polling loop.
- **Fix:** synchronized on the runtime-owned error-state callback while preserving all lifecycle assertions.
- **Verification:** focused loader coverage, workspace unit tests, and full `pnpm test` pass.
- **Committed in:** `3688b640`.

**3. [Quality gate] Split naturally separate responsibilities instead of suppressing findings**

- **Found during:** changed-code AI-slop scan at 84/100.
- **Issue:** loader, pipeline, large fixture, and validator files/functions exceeded the repository quality limits.
- **Fix:** split only existing responsibilities into focused modules, preserved exports/bytes/evidence, and removed unused wrappers/imports.
- **Verification:** targeted/full gates and final AI-slop 100/100 with zero issues.
- **Committed in:** `60adf954`, `c0fd0f15`, `f4fbe31c`, `a1b6bb0c`.

**Total deviations:** 3 auto-fixed correctness/reliability/quality issues. All strengthened the requested behavior without adding protocol surface, dependencies, or package exports.

## Issues Encountered

- The preliminary public event `4f204916521ffc96a61644509984d0b6685f837a3e2123c40d00b85be0b1e997` and d-tag `packaged-loader-ux-zi55c9` are immutable failed evidence after the injection bug; the validator rejects them and the corrected proof uses a fresh event/d-tag.
- `pnpm changeset status` remains blocked by the repository's pre-existing `js-yaml` `safeLoad` incompatibility. The changeset itself is covered by diff/full gates, and no dependency change was introduced.
- GitHub reported no hosted checks on the stacked head, so acceptance relies on the recorded local full-suite, live-production, visual, and independent-review gates.

## Remaining Risks

- PR #216 is intentionally stacked, open, and unmerged; integration into the optimizer branch remains a maintainer merge decision.
- The live proof may encounter unrelated Paja CSP diagnostics or fallback-relay 503s; these were separated from application errors, and the accepted sessions recorded zero page/application errors.
- The final publication validator and external read-only H2 audit must still confirm exact remote/PR equality, the seven-file H1..H2 boundary, source/evidence identity, no force event, and secret absence after the metadata push.

## User Setup Required

None.

## Next Phase Readiness

The product implementation and retained production proof are complete at H1. The exact seven-file H2 metadata commit can be normally pushed to PR #216, followed by the final external read-only publication audit; no source/evidence edit is permitted without restarting H1 review.

## Self-Check: PASSED FOR H1

- H1 resolves locally, remotely, and on open PR #216 at `a1b6bb0c8b2533e108c6a84d678daa8ee4226ebb`.
- Base `236d35a4`, containing the #212/#213/#214 fixes, is an ancestor of H1.
- All implementation, evidence, visual, quality, audit, and independent H1 gates pass.
- No source or evidence file is pending modification after H1.
- The unrelated `packages/cli/.napplet/config.json` remains untracked, unprinted, and uncommitted.

---
*Quick task: 260904-nm7*
*Completed: 2026-09-04*
