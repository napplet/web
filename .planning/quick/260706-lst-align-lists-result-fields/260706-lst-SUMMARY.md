---
status: complete
completed: 2026-07-06
quick_id: 260706-lst
commit: 76f5c4d5
---

# Quick Task 260706-lst Summary

## Result

Aligned the `@napplet/nap/lists` add/remove result message types with the live
NAP-LISTS draft's action-specific wire rows while preserving the broader shared
`ListMutationResult` operation return shape.

## Changed

- `packages/nap/src/lists/types.ts`: narrowed `ListsAddResultMessage` so it no
  longer accepts `removed?`, and narrowed `ListsRemoveResultMessage` so it no
  longer accepts `added?`.
- `packages/nap/src/lists/shim.ts`: split mutation result mapping so add
  results copy only `added?` and remove results copy only `removed?`.
- `packages/nap/src/lists/shim.test.ts`: added remove-result coverage and
  regression assertions that malformed opposite-side count fields are ignored.
- `.changeset/lucky-lists-results.md`: added patch changesets for
  `@napplet/nap` and `@napplet/sdk`.

## Validation

- `pnpm --filter @napplet/core type-check` - pass.
- `pnpm --filter @napplet/nap test:unit -- --runInBand packages/nap/src/lists/shim.test.ts` - pass.
- `pnpm --filter @napplet/nap type-check` - pass.
- `pnpm --filter @napplet/sdk type-check` - pass.
- `pnpm build` - pass.
- `pnpm type-check` - pass.
- `pnpm -r test:unit` - pass.
- `pnpm check:jsr` - pass.
- `npx -y aislop@0.12.0 scan --changes` - 98/100 Healthy, with the existing
  `js-yaml` advisory only.
- `node scripts/check-links.mjs http://localhost:8099` - pass, 18 internal URLs
  checked.
- `git diff --check` - pass.

## Remaining Risks

- Real runtime NIP-51/NIP-65 publish behavior was not exercised in this package
  type/shim alignment pass.
