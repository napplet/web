---
phase: 161-ad-hoc-convention-package-contracts
plan: "21"
subsystem: cli-manifest-contracts
tags: [cli, intent, archetype, event-kinds, manifest]
requires:
  - phase: 161-04
    provides: CLI-owned archetype manifest metadata
provides:
  - Object-config support for per-contract event-kind metadata
  - Lossless preservation of canonical template contract tags
affects: [intent-discovery, signed-manifests, phase-161-release]
requirements-completed: [CONV-PKG-03]
status: complete
completed: 2026-07-23
---

# Phase 161 Plan 21: CLI Intent Contract Metadata Summary

CLI object configuration now accepts `{ slug, convention, eventKinds? }` and
emits optional `kind:<number>` fields on the same queryless archetype contract
tag. Existing canonical template tags retain their event-kind fields when
configuration does not replace archetypes.

## Accomplishments

- Preserved omitted, empty, and ordered event-kind arrays through config
  normalization and writes.
- Rejected query/fragment-bearing identities, slug mismatches, and non-unsigned
  event-kind values.
- Preserved only canonical template contract tags and rejected malformed
  trailing metadata without reassigning kinds across tags.
- Kept the `--archetype` and wizard syntax convention-only.

## Commits

- `e1f5b61a` — test(161-21): define contract event kind metadata
- `176e231e` — feat(161-21): preserve contract event kind metadata

## Verification

- `pnpm --filter @napplet/cli test:unit` — 116 tests passed.
- `pnpm --filter @napplet/cli type-check` — passed.
- `pnpm --filter @napplet/cli build` — passed.

## Deviations

None.
