# Quick Task 260706-cmn Summary: Align NAP-COMMON Profile Result

## Outcome

`common.getProfile.result` now matches the live NAP-COMMON draft shape by
returning the relay-owned `RelayEventResult` wrapper as `result?` instead of the
stale split `event?` and `relays?` fields.

## Changed Files

- `packages/core/src/types/common.ts`
- `packages/nap/src/common/shim.test.ts`
- `packages/nap/README.md`
- `apps/docs/packages/nap.md`
- `.changeset/quiet-common-profile.md`

## Simplifications

- Removed duplicated profile relay metadata fields from the shared Common result
  type.
- Reused the existing `RelayEventResult` type from the relay event result model
  rather than introducing a Common-specific alias.
- Kept docs wording focused on the public package behavior rather than copying
  normative spec text into this repo.

## Verification

- `pnpm --filter @napplet/core type-check`
- `pnpm --filter @napplet/nap test:unit -- --runInBand packages/nap/src/common/shim.test.ts`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/sdk type-check`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm check:jsr`
- `npx -y aislop@0.12.0 scan --changes`
- `node scripts/check-links.mjs http://localhost:8099`
- `git diff --check`

## Remaining Risks

- No live shell profile lookup was exercised against relays; this task validates
  package types, shim request correlation, docs, and workspace gates.
- The broader NAP alignment audit is still active. Separate candidate gaps remain
  for follow-up PRs after this Common-specific fix.
