---
status: complete
completed: 2026-07-07
quick_id: 260706-dmu
slug: align-dm-result-envelope-unions
commit: ac9c32e0
---

# Quick Task 260706-dmu Summary

## Result

Aligned the NAP-DM result message types with the `SuccessSchema or DmError`
envelope shape from the `napplet/naps` NAP-DM draft.

`DmError` is now exported from `@napplet/core`, `@napplet/nap/dm`, and the SDK
NAP type barrel. The existing public DM result message names now model a
success payload or an error payload, rejecting envelopes that contain neither
and rejecting mixed success-plus-error envelopes.

## Files Changed

- `packages/core/src/types/dm.ts`
- `packages/core/src/index.ts`
- `packages/nap/src/dm/types.ts`
- `packages/nap/src/dm/index.ts`
- `packages/nap/src/dm/types.test.ts`
- `packages/sdk/src/nap-types.ts`
- `.changeset/sour-dms-align.md`
- `.planning/quick/260706-dmu-align-dm-result-envelope-unions/260706-dmu-PLAN.md`

## Validation

- `pnpm --filter @napplet/core type-check`
- `pnpm --filter @napplet/core build`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/nap test:unit -- --runInBand packages/nap/src/dm/shim.test.ts packages/nap/src/dm/types.test.ts`
- `pnpm --filter @napplet/nap build && pnpm --filter @napplet/sdk type-check`
- `pnpm --filter @napplet/conformance test:unit -- --runInBand src/validators/envelope.drift.test.ts`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm check:jsr`
- `npx -y aislop@0.12.0 scan --changes`
- `node scripts/check-links.mjs http://localhost:8099`
- `git diff --check`

## Remaining Risk

- The slop scan stayed Healthy at 96/100 with the known touched-file warning for
  the central SDK NAP type barrel and the existing `js-yaml` advisory.
- Real DM transport, encryption, send, and subscribe behavior remains shell
  responsibility and was not exercised by this package type alignment.
