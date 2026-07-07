---
quick_id: 260706-lst
slug: align-lists-result-fields
status: complete
date: 2026-07-06
---

# Quick Task 260706-lst: Align NAP-LISTS Result Envelope Fields

## Goal

Align the `lists.add.result` and `lists.remove.result` wire message types with
the live `napplet/naps` NAP-LISTS draft while preserving the shared public
`ListMutationResult` operation return type.

## Evidence Inputs

- `napplet/naps` `origin/nap-lists`, `naps/NAP-LISTS.md`, defines the shared
  `ListMutationResult` schema with both `added?` and `removed?`.
- The same draft narrows wire rows: `lists.add.result` carries `added?` but not
  `removed?`, and `lists.remove.result` carries `removed?` but not `added?`.
- Current `@napplet/nap/lists` result message interfaces both extend the broad
  `ListMutationResult`, allowing either count field on either envelope.

## Tasks

1. Narrow `ListsAddResultMessage` and `ListsRemoveResultMessage` to their
   action-specific result count fields.
2. Keep `ListMutationResult` broad for SDK operation return values, matching the
   shared schema.
3. Update list shim result mapping/tests so add and remove result envelopes each
   prove the action-specific field shape.
4. Add a changeset for affected published packages if the shipped type surface
   changes.
5. Run focused and workspace verification, then open a lists-specific PR.

## Verification

- `pnpm --filter @napplet/core type-check`
- `pnpm --filter @napplet/nap test:unit -- --runInBand packages/nap/src/lists/shim.test.ts`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/sdk type-check`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm check:jsr`
- `npx -y aislop@0.12.0 scan --changes`
- `node scripts/check-links.mjs http://localhost:8099`
- `git diff --check`

## Result

`ListsAddResultMessage` and `ListsRemoveResultMessage` now match the
action-specific NAP-LISTS wire rows: add results carry `added?` and remove
results carry `removed?`. The shared `ListMutationResult` operation return type
remains broad because the draft schema defines both count fields there.

The lists shim now copies only common result fields plus the count field for the
specific result action, so malformed opposite-side count fields on incoming
envelopes are ignored. Unit coverage asserts both the add and remove paths.

Verification completed on 2026-07-06:

- `pnpm --filter @napplet/core type-check`
- `pnpm --filter @napplet/nap test:unit -- --runInBand packages/nap/src/lists/shim.test.ts`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/sdk type-check`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm check:jsr`
- `npx -y aislop@0.12.0 scan --changes` (98/100 Healthy; existing `js-yaml`
  advisory only)
- `node scripts/check-links.mjs http://localhost:8099` (18 internal URLs,
  no broken links)
- `git diff --check`
