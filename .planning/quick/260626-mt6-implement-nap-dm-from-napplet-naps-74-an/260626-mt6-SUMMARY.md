# Quick Task 260626-mt6 Summary: Implement NAP-DM

Date: 2026-06-26
Implementation commit: c451810
Source spec: https://github.com/napplet/naps/pull/74

## Outcome

Implemented NAP-DM as a runtime-owned direct-message capability across the napplet packages:

- Added core DM payload types and `dm` domain support.
- Added `@napplet/nap/dm` types, shim, SDK helpers, subpath exports, JSR exports, and tsup entries.
- Added `window.napplet.dm` installation through `@napplet/shim`.
- Added `@napplet/sdk` service/runtime/type exports for DM.
- Added conformance envelope coverage for `dm.status`, `dm.conversations`, `dm.messages`, `dm.send`, `dm.subscribe`, `dm.unsubscribe`, and `dm.message`.
- Updated README/package docs and added a release changeset.

## Verification

- `pnpm --filter @napplet/nap exec vitest run src/dm/shim.test.ts`
- `pnpm --filter @napplet/core exec vitest run src/index.test.ts`
- `pnpm --filter @napplet/conformance exec vitest run src/validators/envelope.test.ts src/validators/envelope.drift.test.ts`
- `pnpm --filter @napplet/core build`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/nap build`
- `pnpm --filter @napplet/sdk type-check`
- `pnpm --filter @napplet/shim type-check`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm test:conformance`
- `pnpm lint` (no lint tasks configured)
- `git diff --check`
- `pnpm dlx aislop scan --json .` => 92/Healthy, 0 fixable, 0 ai-slop diagnostics

## Residual Risk

- No shell implementation was runtime-tested against the DM API in this branch.
- AI-slop still reports inherited non-fixable warnings: file-size pressure in existing aggregator files and the existing `js-yaml` advisory.
