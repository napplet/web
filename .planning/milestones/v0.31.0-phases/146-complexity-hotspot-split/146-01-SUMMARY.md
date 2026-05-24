---
phase: 146-complexity-hotspot-split
plan: 01
subsystem: quality
tags: [complexity, refactor, vite-plugin, connect]

requires:
  - phase: 145-type-safety-boundary-repair
provides:
  - Long-function scanner findings removed
  - Reviewed deferrals for oversized public surfaces
  - Behavior-preserving helper extraction
affects: []

tech-stack:
  added: []
  patterns:
    - private helper extraction
    - explicit structural deferral notes

key-files:
  created:
    - .planning/phases/146-complexity-hotspot-split/146-CONTEXT.md
    - .planning/phases/146-complexity-hotspot-split/146-01-PLAN.md
    - .planning/phases/146-complexity-hotspot-split/146-01-SUMMARY.md
    - .planning/phases/146-complexity-hotspot-split/146-VERIFICATION.md
  modified:
    - packages/nub/src/connect/types.ts
    - packages/vite-plugin/src/index.ts
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md

key-decisions:
  - "Split private helpers only; public type/barrel repartitioning is deferred to a compatibility-focused structural milestone."
  - "Kept vite-plugin as one exported package entry while narrowing long local functions."

patterns-established:
  - "Close function-length warnings with private helper boundaries before considering public module splits."

requirements-completed: [QUAL-01, QUAL-02, QUAL-03, QUAL-04]

duration: 16min
completed: 2026-05-24
---

# Plan 146-01: Split Low-Risk Complexity Hotspots Summary

**Removed the scanner's function-length warnings and documented the remaining file-size warnings as reviewed structural deferrals.**

## Accomplishments

- Split `normalizeConnectOrigin` into focused scheme, rest, host/port, IPv4, and DNS-label helpers while preserving byte-identical success returns and existing diagnostics.
- Split the vite-plugin schema walker into keyword validation and child traversal helpers.
- Split `nip5aManifest()` into local helper functions for config resolution, schema validation, connect normalization, HTML tag construction, manifest construction, signing/write fallback, and aggregate-hash injection.
- Confirmed `packages/shim/src/nipdb-shim.ts` no longer trips the function-length rule after earlier cleanup removed comment bulk.
- Reviewed the four remaining file-size warnings and kept them out of scope because each touches public or package-entry structure.

## Deferred File-Size Warnings

| File | Scanner detail | Deferral reason | Future requirement |
|------|----------------|-----------------|--------------------|
| `packages/core/src/types.ts` | 749 lines | Public core protocol surface; splitting requires import-path and declaration-emit compatibility planning. | Preserve existing root exports and downstream type imports. |
| `packages/nub/src/identity/types.ts` | 608 lines | Public identity NUB wire/API type surface; splitting risks subpath and barrel compatibility. | Preserve `@napplet/nub/identity/types` imports and all exported names. |
| `packages/sdk/src/index.ts` | 1022 lines | Public SDK root barrel/proxy surface; splitting can affect tree-shaking and root import semantics. | Keep root `@napplet/sdk` exports stable and prove bundle behavior. |
| `packages/vite-plugin/src/index.ts` | 794 lines | Single-entry Vite plugin module remains large after long-function extraction; an internal split needs fixture coverage for emitted tags, manifest ordering, signing fallback, and HTML mutation. | Preserve the package entry, plugin hook ordering, manifest tags, aggregate-hash behavior, and signing fallback. |

## Evidence

- `/tmp/napplet-146-aislop.json` reports `format.issues = 0`, `lint.issues = 0`, `ai-slop.issues = 0`, `security.issues = 0`, and four code-quality file-size warnings only.
- `pnpm -r type-check` exits 0.
- `pnpm -r build` exits 0.
- `pnpm -r test:unit` exits 0; core 19/19 and nub 58/58 tests pass.
- `git diff --check` exits 0.

## Deviations from Plan

- No separate `packages/shim/src/nipdb-shim.ts` split was needed because the scanner no longer reports a long-function warning there.
- Oversized public files were documented instead of split because the milestone scope is behavior-preserving cleanup, not a public module-boundary redesign.

## Next Phase Readiness

- Phase 147 can run the final quality gate with all kickoff security, lint, AI-slop, duplicate-code, unsafe-cast, and function-length categories closed.

---

*Phase: 146-complexity-hotspot-split*
*Completed: 2026-05-24*
