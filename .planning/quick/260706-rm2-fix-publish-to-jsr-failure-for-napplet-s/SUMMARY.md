---
status: complete
completed: 2026-07-06
commit: 6cb6b6b5
---

# Summary

Fixed the JSR publish failure from GitHub Actions run `28811670437`.

## Root Cause

`@napplet/shim` had a JSR export for `./prelude.global` mapped to
`./src/prelude.global.ts`, but that source file does not exist. The npm export is
valid because `prelude.global` is a generated IIFE artifact emitted to
`dist/prelude.global.js`; JSR validates source exports and rejected the missing
file.

## Changes

- Removed `./prelude.global` from `packages/shim/jsr.json`.
- Kept the npm `@napplet/shim/prelude.global` export unchanged.
- Updated `scripts/sync-jsr-versions.mjs` to skip package-specific generated
  browser artifacts and fail if regenerated JSR exports point at missing source
  files.
- Added `scripts/check-jsr-exports.mjs` and wired it into `pnpm test` through
  `pnpm check:jsr`.
- Clarified shim docs that `prelude.global` is npm-only while JSR exposes the
  source ESM prelude helper.

## Verification

- `pnpm check:jsr`
- `npx jsr publish --dry-run --allow-slow-types --allow-dirty` in
  `packages/shim`
- `pnpm --filter @napplet/shim test:unit`
- `pnpm --filter @napplet/shim type-check`
- `pnpm --filter @napplet/shim build`
- `pnpm build`
- `pnpm type-check`
- `pnpm test`
- `pnpm lint` (no lint tasks configured)
- `git diff --check`
- `pnpm dlx aislop@0.12.0 scan --changes --json .` -> 98/Healthy; zero
  format, lint, code-quality, and AI-slop findings; inherited `js-yaml`
  warning only.

## Follow-Up

After merge, rerun the `Publish to JSR` workflow on `main` so
`@napplet/shim@0.26.4` can publish after the already-published packages are
skipped.
