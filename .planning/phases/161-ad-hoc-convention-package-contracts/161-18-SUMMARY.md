---
phase: 161-ad-hoc-convention-package-contracts
plan: "18"
subsystem: intent-public-facades
tags: [intent, nap, sdk, uri, delivery]
requires:
  - phase: 161-17
    provides: URI-shaped intent shim and carrier-neutral delivery listener
provides:
  - Consistent URI/options intent helpers across NAP and SDK facades
  - Public contract and no-ID delivery exports on all intended barrels
affects: [shim-injection, package-docs, phase-161-release]
requirements-completed: [CONV-PKG-01]
status: complete
completed: 2026-07-23
---

# Phase 161 Plan 18: Intent Public Facades Summary

The NAP subpath and SDK now expose the same authoritative URI-shaped
`invoke`/`open` calls and `onDelivery` listener as the core runtime contract.
Every helper remains a thin delegation to the injected intent domain.

## Accomplishments

- Replaced retired object/role-form helpers with `(uri, options?)`.
- Added `intentOnDelivery` and `intent.onDelivery` without an INC fallback or
  second normalization layer.
- Exported invoke options, manifest contracts, carrier-neutral deliveries, and
  `IntentDeliveryMessage` through NAP and SDK type barrels.
- Updated facade JSDoc to distinguish immediate acceptance from target
  delivery.

## Commits

- `8bf87e9c` — feat(161-18): propagate intent delivery facades

## Verification

- `pnpm --filter @napplet/nap build` — passed.
- `pnpm --filter @napplet/nap type-check` — passed.
- `pnpm --filter @napplet/sdk build` — passed.
- `pnpm --filter @napplet/sdk type-check` — passed.
- Generated declarations contain URI-shaped helpers and `onDelivery`.

## Deviations

None.
