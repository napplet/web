---
quick_id: 260706-dmu
slug: align-dm-result-envelope-unions
status: complete
date: 2026-07-06
---

# Quick Task 260706-dmu: Align NAP-DM Result Envelope Unions

## Goal

Align `@napplet/nap/dm` result message types with the live `napplet/naps`
NAP-DM draft's `SuccessSchema or DmError` result envelope shape.

## Evidence Inputs

- `napplet/naps` `origin/nap-dm`, `naps/NAP-DM.md`, defines `DmError` as a
  schema with required `error`.
- The same draft defines every `*.result` row as `id`, then either the
  operation-specific success schema or `DmError`.
- Current `@napplet/nap/dm` result interfaces extend `Partial<SuccessShape>`
  with `error?`, which permits result envelopes that carry neither `error` nor
  the required success fields.

## Tasks

1. Introduce a reusable DM result helper type for `DmMessageEnvelope` plus
   operation-specific success and error payloads.
2. Replace `Partial<...>` result interfaces with `Success | DmError` union
   types while keeping the exported public names stable.
3. Add type-level regression coverage that rejects empty DM result envelopes and
   accepts valid success/error forms.
4. Add a changeset for affected published packages if the shipped type surface
   changes.
5. Run focused and workspace verification, then open a DM-specific PR.

## Verification

- `pnpm --filter @napplet/core type-check`
- `pnpm --filter @napplet/nap test:unit -- --runInBand packages/nap/src/dm/shim.test.ts`
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

- Exported the NAP-DM `DmError` schema through `@napplet/core`,
  `@napplet/nap/dm`, and the SDK NAP type barrel.
- Replaced permissive `Partial<SuccessShape> & { error?: string }` result
  message interfaces with success-or-error unions for the existing public
  `DmStatusResultMessage`, `DmConversationsResultMessage`,
  `DmMessagesResultMessage`, `DmSendResultMessage`,
  `DmSubscribeResultMessage`, and `DmUnsubscribeResultMessage` names.
- Kept non-exported result envelope interfaces with literal `type:` properties
  so the conformance drift guard continues to see every DM result discriminant.
- Added DM type tests that accept valid success/error envelopes and reject
  empty or mixed success-plus-error result envelopes.

Verification completed:

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
- `npx -y aislop@0.12.0 scan --changes` (96/100 Healthy; warnings were the
  touched central SDK NAP type barrel size and existing `js-yaml` advisory)
- `node scripts/check-links.mjs http://localhost:8099` against a local static
  `site/` build
- `git diff --check`
