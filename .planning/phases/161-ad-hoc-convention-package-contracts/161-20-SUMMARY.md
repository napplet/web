---
phase: 161-ad-hoc-convention-package-contracts
plan: "20"
subsystem: vite-manifest-contracts
tags: [vite, intent, archetype, event-kinds, manifest]
requires:
  - phase: 161-03
    provides: Convention-bearing archetype metadata
provides:
  - Queryless per-contract archetype tags with optional same-tag event kinds
  - Validation for slug/identity agreement and unsigned event-kind metadata
affects: [intent-discovery, signed-manifests, phase-161-release]
requirements-completed: [CONV-PKG-02]
status: complete
completed: 2026-07-23
---

# Phase 161 Plan 20: Vite Intent Contract Metadata Summary

Vite archetype entries now accept `{ slug, convention, eventKinds? }` and emit
one stable queryless convention contract per manifest tag, with optional
same-tag `kind:<number>` fields.

## Accomplishments

- Preserved the three-field tag when `eventKinds` is absent.
- Added ordered one/many event-kind serialization without moving kinds between
  repeated convention tags.
- Rejected query/fragment-bearing identities, slug mismatches, and negative or
  fractional event kinds.
- Kept archetype metadata outside the path-only aggregate hash.

## Commits

- `6e231f1b` — test(161-20): define intent contract manifest metadata
- `0fe9c377` — feat(161-20): emit intent contract event kinds

## Verification

- `pnpm --filter @napplet/vite-plugin test:unit` — 31 tests passed.
- `pnpm --filter @napplet/vite-plugin build` — passed.
- `pnpm --filter @napplet/vite-plugin type-check` — passed.

## Deviations

None.
