# Quick Task 260707-hrs Summary: Align RESOURCE htree Scheme

## Outcome

Opened the package surface for the `htree:` scheme now listed by NAP-RESOURCE.
The public `ResourceScheme` union, package comments, README scheme lists, SDK
examples, shim docs, and build-napplet skill guidance now include `htree:` while
leaving runtime fetch behavior unchanged.

Source commit: `7ec9561f`

## Changed Files

- `.changeset/tidy-htrees-fetch.md`
- `packages/core/src/types/global.ts`
- `packages/core/src/types/global/runtime-api.ts`
- `packages/nap/README.md`
- `packages/nap/src/resource/index.ts`
- `packages/nap/src/resource/sdk.ts`
- `packages/nap/src/resource/shim.ts`
- `packages/nap/src/resource/types.ts`
- `packages/nap/src/resource/types.test.ts`
- `packages/sdk/README.md`
- `packages/sdk/src/config.ts`
- `packages/shim/README.md`
- `packages/skills/skills/build-napplet/SKILL.md`

## Simplifications Made

- Removed stale "four canonical schemes" wording from shipped docs and comments.
- Kept `htree:` as a scheme/type/doc alignment change instead of adding a
  napplet-side handler; non-`data:` schemes already route to the shell.
- Added a narrow type regression instead of broad runtime tests for shell-owned
  Hashtree resolution.

## Verification

- `pnpm --filter @napplet/core type-check`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/sdk type-check`
- `pnpm --filter @napplet/nap exec vitest run src/resource/types.test.ts src/resource/shim.test.ts`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm check:jsr`
- `npx -y aislop@0.12.0 scan --changes` - 96/100 Healthy, with existing
  warnings for `packages/nap/src/resource/shim.ts` size and the `js-yaml`
  advisory.
- `git diff --check`

## Remaining Risks

- Real shell-side `htree:` resolution and Hashtree verification were not tested
  here; NAP-RESOURCE assigns that behavior to shells.
- The slop gate remains below 100 due to existing resource shim size and
  dependency advisory warnings, not this scheme-surface change.
