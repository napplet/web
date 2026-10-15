---
phase: 162-blossom-backed-large-asset-optimization
plan: "01"
subsystem: vite-plugin
tags: [vite, blossom, resource, retained-assets, transaction]
dependency_graph:
  requires: [single-file artifact rendering, NAP-RESOURCE resource.bytes]
  provides: [retained asset optimization pipeline, private resource loader]
  affects: [single-file manifest generation]
tech_stack:
  added: []
  patterns: [deterministic planning, dependency injection, transactional artifact commit]
key_files:
  created:
    - packages/vite-plugin/src/optimizer/pipeline.ts
    - packages/vite-plugin/src/optimizer/loader.ts
  modified:
    - packages/vite-plugin/src/html.ts
    - packages/vite-plugin/src/index.ts
    - packages/vite-plugin/src/manifest.ts
    - packages/vite-plugin/src/optimizer/pipeline.test.ts
decisions:
  - "Retain Vite asset boundaries only while evaluating the candidate artifact; commit either a verified externalized artifact or the ordinary all-inline artifact."
  - "Emit the existing resource requirement only after a verified resource transaction commits; keep the deterministic source-to-resource mapping private to index.html."
metrics:
  duration: "~8 minutes"
  completed_date: "2026-08-21"
  tasks_completed: 1
  files_changed: 6
status: complete
---

# Phase 162 Plan 01: Retained Asset Optimization Tracer Summary

Implemented a deterministic retained-Vite-asset tracer that verifies fake Blossom upload and NAP-RESOURCE byte recovery before committing a single-file artifact.

## Tasks Completed

1. Trace one retained asset through verified upload, rewrite, commit, and byte recovery — completed.

## Implementation

- Added pure threshold planning, largest-byte then normalized-path selection, candidate rendering/measurement, exact-byte SHA-256 verification, and rollback-safe artifact commits.
- Added a private, deterministic resource table and generated loader that uses only `window.napplet.resource.bytes`, validates Blob length/digest, and never adds a network path or protocol surface.
- Retained asset boundaries during Vite output evaluation, then committed either a verified resource-backed artifact or the original all-inline single-file output. The manifest receives exactly one existing `['requires', 'resource']` tag only after a committed resource transaction.
- Preserved the existing code-split rejection and computes the NIP-5A aggregate from the final committed `index.html`.

## Verification

- PASS — `pnpm --filter @napplet/vite-plugin test:unit -- optimizer/pipeline.test.ts` (42 tests)
- PASS — `pnpm --filter @napplet/vite-plugin test:unit` (42 tests)
- PASS — `pnpm --filter @napplet/vite-plugin type-check`
- PASS — `pnpm --filter @napplet/vite-plugin build`
- PASS — generated tracer test verifies no private table fields enter manifest tags, canonical lowercase Blossom URIs are emitted, and selected source files are removed only after commit.
- PASS — `git diff --check`
- WARN — changed-file AI-slop scan reports pre-existing unused spike import and root dependency advisories; recorded in `deferred-items.md` without modifying unrelated files.

## TDD Gate Compliance

- RED: `30e9c771` — retained artifact optimizer tests failed before implementation.
- GREEN: `7658128b` — deterministic planner, loader, transaction, and manifest integration pass the tracer suite.
- REFACTOR: incorporated in GREEN while recovering the interrupted implementation; no separate cleanup commit was needed.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - Bug] Commit verified exhaustion results and remove all rendered retained output**
   - **Found during:** Task 1 recovery verification
   - **Issue:** A verified selection that exhausted candidates above the 2 MiB target was discarded, and the in-memory commit retained assets that the rendered HTML had already inlined.
   - **Fix:** Commit every verified selected-resource transaction regardless of target status, preserve its nonfatal `target-not-reached` report, and remove all retained output only after final verification. Added non-trigger baseline coverage.
   - **Files modified:** `packages/vite-plugin/src/html.ts`, `packages/vite-plugin/src/manifest.ts`, `packages/vite-plugin/src/optimizer/pipeline.ts`, `packages/vite-plugin/src/optimizer/pipeline.test.ts`
   - **Verification:** package unit suite, type-check, and build pass.
   - **Commit:** `7658128b`

## Deferred Issues

- The project-level AI-slop scan remains below its target because of an existing unused import in the phase spike and known root dependency advisories. See `deferred-items.md`.

## Known Stubs

None.

## Self-Check: PASSED

- Required optimizer files exist on disk.
- RED commit `30e9c771` and GREEN commit `7658128b` exist in git history.
