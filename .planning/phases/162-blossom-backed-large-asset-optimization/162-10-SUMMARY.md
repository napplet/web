---
phase: 162-blossom-backed-large-asset-optimization
plan: "10"
subsystem: vite-plugin
tags: [vite, blossom, nap-resource, integration, documentation]
dependency_graph:
  requires: [162-06, 162-09]
  provides: [generated-50m-vite-evidence, bounded-whole-blob-policy]
  affects: [vite-plugin, build-tools, docs]
tech_stack:
  added: []
  patterns: [runtime-generated-fixture, test-only-vite-service-harness]
key_files:
  created: [packages/vite-plugin/src/optimizer/large-fixture.ts, packages/vite-plugin/src/optimizer/large-fixture.evidence.json, packages/build-tools/README.md]
  modified: [packages/vite-plugin/src/index.ts, packages/vite-plugin/src/manifest.ts, packages/vite-plugin/src/optimizer/pipeline.ts, packages/vite-plugin/src/optimizer/large-fixture.test.ts, packages/vite-plugin/README.md, packages/cli/README.md, apps/docs/packages/vite-plugin.md, README.md]
decisions:
  - "The Vite integration test injects local boundaries through an internal WeakMap harness, not a public plugin option."
  - "Assets over 10 MiB are ineligible whole Blobs and retain the nonfatal inline fallback; streaming and ranges are not claimed."
metrics:
  duration: "~90 minutes"
  completed: "2026-08-21"
  tasks_completed: 3
  files_changed: 11
status: complete
---

# Phase 162 Plan 10: Large Asset Demonstration and Documentation Summary

The real Vite plugin build now proves a deterministic 55 MiB multi-asset offload through signed fake discovery, exact Blossom BUD uploads, conditional resource requirements, and byte-exact NAP-RESOURCE recovery without committing generated binaries.

## Delivered

- Runtime-generated seven-asset fixture: 57,671,680 candidate bytes, every Blob 6–9 MiB; actual `vite.build()` invokes the public `nip5aManifest()` hooks.
- Compact machine-readable evidence pins 76,896,853 would-be HTML bytes, 8,366 final bytes, seven exact upload/recovery hashes, final index hash `cc6719e89c46acee49dc0a67d44e35286f2943db3103490dda719ade560db716`, and aggregate `deca44de168d770648d7049d86ca5dfb45f7bc1420bd019815e1184ae3a5436f`.
- Valid fake 10002 → write/unmarked relays → 10063 discovery, kind-24242 authorization, verified descriptors, secondary failure, corrupt resource rejection, and complete-Blob portability fallback.
- Public docs distinguish canonical NIP/NAP/BUD sources from private loader/mapping and other non-normative implementation behavior.

## Verification

- `pnpm --filter @napplet/vite-plugin test:unit -- optimizer/large-fixture.test.ts` — passed (actual Vite build; 75 package tests).
- `pnpm --filter @napplet/vite-plugin type-check` — passed.
- `pnpm --filter @napplet/vite-plugin build` — passed.
- `pnpm --filter @napplet/build-tools build` — passed.
- `pnpm check:links` — not runnable standalone because its configured localhost docs server was not running; it reported only `http://localhost:8099/` unavailable.

## Deviations from Plan

### Auto-fixed Issues

1. [Rule 1 - Bug] Resolved a relative Vite `outDir` against the project root so plugin manifest writing occurs in the actual Vite output directory.
2. [Rule 2 - Missing critical functionality] Made assets larger than the whole-Blob bound explicitly ineligible, preserving the inline nonfatal result without claiming streaming or range support.

## Known Stubs

None.

## Self-Check: PASSED

Verified task commits `83a3f588`, `63419be2`, and `8a76dbbf` exist; all generated fixture bytes remain in temporary directories only.
