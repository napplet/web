---
status: complete
quick_id: 260703-ver
date: 2026-07-03
commit: 851d7ba2
---

# Quick Task 260703-ver: Chase NAP-OUTBOX eose removal

## Result

Aligned napplet's shipped NAP-OUTBOX surface with the current canonical
`napplet/naps#32` draft after removal of caller-visible `outbox.eose`,
`strategy`, and subscribe `live` controls.

## Changed Files

- `packages/core/src/types/outbox.ts`
- `packages/core/src/index.ts`
- `packages/core/src/types/global.ts`
- `packages/core/src/types/global/service-api.ts`
- `packages/core/src/boundary.ts`
- `packages/nap/src/outbox/types.ts`
- `packages/nap/src/outbox/index.ts`
- `packages/nap/src/outbox/shim.ts`
- `packages/nap/src/outbox/sdk.ts`
- `packages/nap/src/outbox/shim.test.ts`
- `packages/sdk/src/cvm.ts`
- `packages/sdk/src/nap-types.ts`
- `apps/docs/naps/index.md`
- `apps/docs/packages/core.md`
- `.changeset/chilly-outboxes-drop-routing-controls.md`

## Simplifications Made

- Deleted `OutboxStrategy` from public core, nap, and SDK re-export surfaces.
- Removed `strategy` fields from outbox event, query, publish, and relay-plan
  option/target types.
- Removed the outbox subscribe `live` field; subscription lifetime is now only
  represented by the returned handle plus `outbox.close` / `outbox.closed`.
- Replaced examples and tests with current spec-valid `author`, `authors`,
  `relays`, `targetAuthors`, `direction`, `limit`, and `timeoutMs` options.

## Verification

- `gh pr view https://github.com/napplet/naps/pull/32 --json ...` confirmed
  open NAP-OUTBOX PR head includes semantic removal commits.
- `gh api repos/napplet/naps/commits/70515a5...` confirmed the strategy/live
  removal commit and touched `naps/NAP-OUTBOX.md`.
- `gh api 'repos/napplet/naps/contents/naps/NAP-OUTBOX.md?ref=nap-outbox'`
  confirmed active NAP-OUTBOX text has no `outbox.eose`, `strategy`, or
  subscribe `live` field.
- `pnpm --filter @napplet/nap exec vitest run src/outbox/shim.test.ts` passed:
  1 file, 9 tests.
- `pnpm type-check` passed across the workspace.
- `pnpm -r test:unit` passed across the workspace.
- `pnpm build` passed across the workspace.
- `pnpm lint` executed successfully but reported zero configured lint tasks.
- No `.aislop/config.yml` exists in this checkout, so no AI-slop gate was
  available to run.
- `git diff --check` passed.
- Targeted grep found no active `OutboxStrategy`, outbox `strategy?:`,
  `{ live: true }`, outbox `live?: boolean`, or `outbox.eose` surface outside
  changelog history; remaining `live?: boolean` matches are media-owned.

## Remaining Risks

- Runtime interoperability with a shell implementation of the latest draft
  NAP-OUTBOX was not exercised in this repo.
