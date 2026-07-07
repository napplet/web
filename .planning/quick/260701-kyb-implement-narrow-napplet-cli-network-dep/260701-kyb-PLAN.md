# Quick Task 260701-kyb: Implement narrow network deploy for local signers

**Date:** 2026-07-01
**Status:** complete

## Scope

Enable non-`--dry-run` `napplet deploy` for local private-key signing only: upload discovered files to configured Blossom servers and publish signed root/named/snapshot manifest events to configured relays.

Out of scope: `nbunksec`/bunker signing, CI revocable keys, relay/server discovery, app/profile/server-list publishing, delete/sync/status flows, and generalized progress UI.

## Tasks

1. Add Deno-native network deploy helpers.
   - Build BUD-style Blossom upload auth events from local signer output.
   - Upload unique deploy files to each configured server with HEAD preflight and PUT `/upload`.
   - Publish signed manifest events to configured relays through `nostr-tools` `SimplePool`.

2. Wire `napplet deploy` non-dry-run.
   - Require a local signer for network deploy.
   - Require configured `relays` and `blossomServers`.
   - Preserve dry-run output as the inspectable path.

3. Add focused tests with injected fetch/publisher fakes.

4. Update README, CLI scope text, shebang/task permissions, and changeset.

## Verification

- `deno fmt --check packages/cli`
- `deno lint packages/cli`
- `pnpm --filter @napplet/cli build`
- `pnpm --filter @napplet/cli test:unit`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm dlx aislop@0.12.0 scan --json .`
- `git diff --check`
