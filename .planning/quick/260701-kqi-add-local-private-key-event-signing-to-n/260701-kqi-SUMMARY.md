# Quick Task 260701-kqi Summary: Local dry-run event signing

**Date:** 2026-07-01
**Status:** complete
**Commit:** `9c2f6510` (`Sign dry-run manifests with local private keys`)

## Completed

- Added local signing primitives for 64-character hex and `nsec` private keys.
- Wired `napplet deploy --dry-run` to attach `signedEvent` for built root/named manifest templates when a local private key is available from `--sec`, `--prompt-sec`, or the configured native key-store reference.
- Declared `nostr-tools` as the CLI runtime dependency instead of relying on a transitive workspace dependency.
- Updated CLI README and added a changeset for the shipped signing surface.
- Added unit coverage for private-key decoding, NIP-01 event signing, and skipped unsigned snapshot entries.

## Verification

- `deno fmt --check packages/cli`
- `deno lint packages/cli`
- `pnpm --filter @napplet/cli build`
- `pnpm --filter @napplet/cli test:unit`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm dlx aislop@0.12.0 scan --json .` (0 errors, 7 pre-existing warnings)
- `git diff --check`

## Remaining Scope

- Network upload/publish remains disabled behind `--dry-run`.
- `nbunksec`/bunker signing and CI revocable-key workflows are still pending.
- Snapshot templates remain skipped until source-address wiring can provide the required NIP-5A `a` tag.
