# Quick Task 260703-ver: Chase NAP-OUTBOX eose removal

## Goal

Align napplet's shipped NAP-OUTBOX API surface with the current canonical
`napplet/naps` NAP-OUTBOX PR after `outbox.eose`, caller-selected `strategy`,
and subscribe `live` controls were removed.

## Evidence Inputs

- `napplet/naps#32` on branch `nap-outbox`
- Commit `70515a5a811812f4d874d101b8b2607d936d7da7`
- Current NAP-OUTBOX text: no `outbox.eose`, no `strategy`, no subscribe
  `live` option

## Tasks

1. Remove stale API types and exports
   - Files: `packages/core/src/types/outbox.ts`,
     `packages/core/src/index.ts`, `packages/nap/src/outbox/types.ts`,
     `packages/nap/src/outbox/index.ts`, `packages/sdk/src/nap-types.ts`
   - Action: delete `OutboxStrategy` and remove all `strategy` / outbox
     subscribe `live` option fields from public types.
   - Verify: grep finds no active `OutboxStrategy`, `strategy?:`, or outbox
     `live?:` contract surface.

2. Refresh examples, docs, and tests
   - Files: outbox shim/sdk docs, package docs, app docs, and targeted tests.
   - Action: replace removed option examples with spec-valid author, relay,
     target author, direction, limit, and timeout options.
   - Verify: outbox shim tests pass and stale examples no longer compile
     against removed fields.

3. Record shipped-package impact
   - Files: `.changeset/*`
   - Action: add a minor changeset for packages whose shipped type/docs output
     changes.
   - Verify: changeset is present and names the affected packages.

## Verification

- `pnpm --filter @napplet/nap test:unit -- --run src/outbox/shim.test.ts`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm build`
- Targeted greps for removed NAP-OUTBOX surface.
