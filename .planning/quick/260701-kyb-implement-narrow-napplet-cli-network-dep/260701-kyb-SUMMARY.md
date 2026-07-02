# Quick Task 260701-kyb Summary: Local-signer network deploy

**Date:** 2026-07-01
**Status:** complete
**Commit:** `272ff8f7` (`Enable local-signer network deploys`)

## Completed

- Added Deno-native deploy network helpers for local-signer deploys.
- Built Blossom upload authorization events with kind `24242`, `t=upload`, `x` blob hashes, expiration, and `client=napplet`.
- Uploaded unique deploy files to configured Blossom servers with HEAD preflight and PUT `/upload`.
- Published signed root/named/snapshot manifest events to configured relays through `nostr-tools` `SimplePool`.
- Wired non-`--dry-run` `napplet deploy` for local hex/`nsec` signers and kept `--dry-run` as the inspectable output path.
- Updated CLI network permissions, README wording, changeset metadata, and fake-network unit tests.

## Verification

- `deno fmt --check packages/cli`
- `deno lint packages/cli`
- `pnpm --filter @napplet/cli build`
- `pnpm --filter @napplet/cli test:unit` (31 passed)
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm dlx aislop@0.12.0 scan --json .` (0 errors, 7 pre-existing warnings)
- `git diff --check`

## Remaining Scope

- Live Blossom upload and live relay publish still need real-network proof.
- `nbunksec`/bunker signing and CI revocable-key workflows are still pending.
- Relay/server discovery, status/debug, sync/delete flows, and richer progress UI remain future slices.
