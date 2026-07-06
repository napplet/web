---
status: complete
created: 2026-07-06
quick_id: 260706-psu
slug: task-resolve-napplet-web-126-by-adding-a
---

# Quick Task 260706-psu: Resolve #126 Host Prelude Surface

## Goal

Resolve napplet/web#126 by adding a package-owned host-injectable NIP-5D
runtime prelude surface to `@napplet/shim`.

## Requirements

- Preserve the existing root `@napplet/shim` side-effect import behavior.
- Add a no-auto host surface that requires an explicit NAP domain allowlist.
- Ship a self-contained browser/IIFE artifact that shell runtimes can inline
  before authored napplet scripts in `iframe.srcdoc`.
- Install only requested known `window.napplet.<domain>` objects.
- Keep implementation backed by the existing shim/domain wrappers instead of
  hand-rolling a second copy of each NAP surface.
- Document npm package usage and add a patch changeset.

## Implementation

- Move the existing shim implementation into `src/runtime.ts`.
- Keep `src/index.ts` as the compatibility side-effect entry.
- Add `src/prelude.ts` with:
  - `installNappletRuntimePrelude({ domains })`
  - `renderNappletRuntimePreludeCall({ domains })`
  - `renderNappletRuntimePreludeScript({ domains })`
  - `install` alias for the IIFE global
- Add `dist/prelude.global.js` via tsup IIFE build with `NappletShimPrelude`
  global name.
- Export `@napplet/shim/prelude` and `@napplet/shim/prelude.global`.

## Verification Plan

- `pnpm --filter @napplet/shim type-check`
- `pnpm --filter @napplet/shim exec vitest run`
- `pnpm --filter @napplet/shim build`
- Dist smoke: execute `dist/prelude.global.js` in a fake browser VM, install
  `identity` + `storage`, assert `relay` is absent, and resolve
  `identity.getPublicKey()` via a posted result envelope.
- Package export smoke: resolve `@napplet/shim/prelude.global` and import
  `@napplet/shim/prelude`.
- Root gates before PR: `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`,
  `pnpm lint`, `git diff --check`.

## Outcome

Implemented in commit `4e726171`.
