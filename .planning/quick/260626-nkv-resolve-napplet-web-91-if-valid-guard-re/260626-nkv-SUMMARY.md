# Quick Task 260626-nkv Summary: Guard Relay Query Events

Date: 2026-06-26
Implementation commit: 9d23f6c
Issue: https://github.com/napplet/web/issues/91

## Outcome

Validated issue #91 and fixed the relay shim contract leak:

- Added a focused regression test for `relay.query.result` messages that omit `events`.
- Updated `query()` to resolve `[]` when successful result payloads contain missing or non-array `events`.
- Added patch changesets for `@napplet/nap` and `@napplet/shim`.

## Verification

- `pnpm --filter @napplet/nap exec vitest run src/relay/shim.test.ts` failed before the guard with `Received: undefined`.
- `pnpm --filter @napplet/nap exec vitest run src/relay/shim.test.ts`
- `pnpm --filter @napplet/nap type-check`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm test:conformance`
- `pnpm lint` (no lint tasks configured)
- `git diff --check`
- `pnpm dlx aislop scan --json .` => 92/Healthy, 0 fixable, 0 ai-slop diagnostics

## Residual Risk

- No live downstream shell/runtime was exercised in this branch.
- AI-slop still reports inherited non-fixable warnings: file-size pressure in existing aggregator files and the existing `js-yaml` advisory.
