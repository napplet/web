---
status: complete
created: 2026-07-06
quick_id: 260706-psu
commit: 4e726171
---

# Quick Task 260706-psu Summary

Resolved napplet/web#126 by adding a package-owned host-injectable NIP-5D
runtime prelude surface to `@napplet/shim`.

## Delivered

- Preserved the legacy root `@napplet/shim` side-effect entry.
- Moved shared implementation into `packages/shim/src/runtime.ts`.
- Added `@napplet/shim/prelude` with:
  - `installNappletRuntimePrelude({ domains })`
  - `renderNappletRuntimePreludeCall({ domains })`
  - `renderNappletRuntimePreludeScript({ domains })`
  - `install` alias for the IIFE global
- Added npm export `@napplet/shim/prelude.global` resolving to
  `dist/prelude.global.js`.
- Added a tsup browser IIFE build exposing `globalThis.NappletShimPrelude`.
- Required an explicit domain allowlist for the host prelude surface.
- Added unit coverage for allowlist enforcement, callable domain installation,
  unknown-domain filtering, and activation string rendering.
- Documented srcdoc host injection in the package README and docs site.
- Added a patch changeset for `@napplet/shim`.

## Verification

- `pnpm --filter @napplet/shim type-check`
- `pnpm --filter @napplet/shim exec vitest run`
- `pnpm --filter @napplet/shim build`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm lint` (no lint tasks configured)
- `git diff --check`
- Dist smoke: executed `packages/shim/dist/prelude.global.js` in a fake browser
  VM, installed `identity` + `storage`, confirmed `relay` was absent, and
  resolved `identity.getPublicKey()` from an `identity.getPublicKey.result`
  envelope.
- Package export smoke: `@napplet/shim/prelude` imports and
  `@napplet/shim/prelude.global` resolves to `dist/prelude.global.js`.
- Pack smoke: `npm pack` includes `dist/prelude.global.js`, `dist/prelude.js`,
  `dist/prelude.d.ts`, and package metadata.
- AI-slop was not runnable in this checkout: no `aislop` / `ai-slop` CLI and no
  `.aislop/config.yml` are present.
