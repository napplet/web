---
phase: 162-blossom-backed-large-asset-optimization
plan: "07"
subsystem: vite-optimizer
tags: [vite, blossom, nap-resource, postcss-value-parser, integrity, object-url]
dependency_graph:
  requires:
    - phase: 162-01
      provides: private resource-table tracer and transactional optimizer pipeline
    - phase: 162-03
      provides: Node-compatible shared build-service boundary
  provides:
    - parser-backed static-reference eligibility inventory
    - bounded private whole-Blob resource runtime with integrity validation
    - selection/report gating tied to complete supported coverage
  affects: [162-09, 162-10, vite-plugin, resource-requirements]
tech_stack:
  added: [postcss-value-parser@4.2.0]
  patterns: [complete-reference eligibility, private resource-table runtime, bounded object-URL lifecycle]
key_files:
  created:
    - packages/vite-plugin/src/optimizer/references.ts
    - packages/vite-plugin/src/optimizer/references.test.ts
    - packages/vite-plugin/src/optimizer/loader.test.ts
  modified:
    - packages/vite-plugin/package.json
    - pnpm-lock.yaml
    - packages/vite-plugin/src/optimizer/loader.ts
    - packages/vite-plugin/src/optimizer/pipeline.ts
    - packages/vite-plugin/src/optimizer/pipeline.test.ts
key_decisions:
  - "Treat the embedded resource table and generated loader as private signed-artifact implementation metadata, never protocol surface or a NIP-5A field."
  - "Reject any asset with an unenumerated or mixed reference form, preserving it inline with deterministic reason codes."
  - "Expose verified resources only after existing NAP-RESOURCE whole-Blob calls, exact byte-length/digest validation, and bounded cache/object-URL ownership."
patterns_established:
  - "Use postcss-value-parser for static stylesheet URLs; do not regex-rewrite CSS grammar."
  - "Use resource.bytes for singular lazy recovery and resource.bytesMany for bounded ordered batches; never add browser-network fallback."
requirements_completed: []
coverage:
  - id: D1
    description: Parser-backed static JavaScript/media/CSS reference eligibility preserves every unsupported or mixed form.
    verification:
      - kind: unit
        ref: packages/vite-plugin/src/optimizer/references.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Private runtime recovers verified whole Blobs only through existing resource.bytes and resource.bytesMany with bounded cleanup.
    verification:
      - kind: unit
        ref: packages/vite-plugin/src/optimizer/loader.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: External-resource selection and committed-resource reporting include only fully supported resources.
    verification:
      - kind: unit
        ref: packages/vite-plugin/src/optimizer/pipeline.test.ts
        status: pass
    human_judgment: false
metrics:
  duration: 8min
  tasks_completed: 3
  files_modified: 8
  completed_date: 2026-08-21
status: complete
---

# Phase 162 Plan 07: Bounded Resource Reference Runtime Summary

**Parser-backed asset eligibility and a private, bounded NAP-RESOURCE whole-Blob loader that only exposes size- and SHA-256-verified data to supported consumers.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-21T16:35:09Z
- **Completed:** 2026-08-21T16:42:58Z
- **Tasks:** 3/3
- **Files modified:** 8

## Accomplishments

- Added an explicit inventory for Vite-owned JavaScript sentinels, owned media targets, and static stylesheet/font URLs; CSS rewriting uses `postcss-value-parser` and preserves quoting, whitespace, fragments, fallbacks, comments, and data URLs.
- Marked direct HTML, `srcset`, inline/dynamic CSS, computed strings, worker, module, and WASM-streaming forms ineligible with stable reasons, keeping their bytes inline.
- Added a private `ResourceRuntime` and generated loader that use only the existing `window.napplet.resource.bytes` and `bytesMany` operations, verify canonical lowercase Blossom mappings and exact blobs, bound work/cache lifetime, and revoke owned object URLs.
- Connected eligibility to selection and transactions so ineligible/unreferenced assets never enter the private table, and `committedResourceCount` stays zero unless the selected resource transaction commits.

## Task Commits

1. **Task 1 RED: Reference classifier vectors** — `e4c86ebf` (`test`)
2. **Task 1 GREEN: Bounded reference classifier** — `910aad13` (`feat`)
3. **Task 2 RED: Resource runtime vectors** — `de4015c8` (`test`)
4. **Task 2 GREEN: Bounded resource recovery** — `a30faa17` (`feat`)
5. **Task 3 RED: Selection eligibility vectors** — `75fb5223` (`test`)
6. **Task 3 GREEN: Complete-reference selection gate** — `bc2c1756` (`feat`)

## Verification

- `pnpm --filter @napplet/vite-plugin test:unit` — 4 files, 64 tests passed.
- `pnpm --filter @napplet/vite-plugin type-check` — passed.
- `pnpm --filter @napplet/vite-plugin build` — passed.
- `pnpm dlx aislop@0.12.0 scan --json packages/vite-plugin/src/optimizer` — 100/100, no findings.
- `git diff --check` — passed.

## Decisions Made

- NAP-RESOURCE remains a whole-Blob interface. This plan does not claim range reads, streaming, progress, universal browser interception, or portable single-Blob 50 MiB recovery.
- The generated mapping is private implementation metadata embedded in the signed artifact; it creates no NIP-5A tag, NIP-5D manifest field, message type, handshake, browser direct-network path, or external-script allowance.
- Resource-domain absence and every missing, malformed, reordered, rejected, timed-out, oversized, or digest-mismatched result fail visibly before a `Response` or object URL can be exposed.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. The empty arrays and maps in optimizer code/tests are initialized runtime state, not UI-facing placeholders or disconnected data sources.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Later optimizer integration can use `ReferenceInventory`, `classifyAssetReferences`, and `ResourceRuntime` as private generated-artifact plumbing without expanding protocol surface.
- Conditional `['requires', 'resource']` emission can rely exclusively on the committed resource count; direct HTML and other unsupported assets stay inline.
- The approved `postcss-value-parser@4.2.0` lock update contains only the Vite importer, package resolution, and snapshot hunks. The user-owned root `package.json` and `deno.lock` remain unstaged and byte-identical to their pre-task hashes.

## Self-Check: PASSED

- All six optimizer implementation/test files and this summary exist.
- All six task RED/GREEN commits resolve in repository history.
- The root `package.json` and `deno.lock` remain byte-identical to their recorded unowned dirty-state hashes.
