# Quick Task 260701-kuy: Wire local signer pubkeys into snapshot dry-run manifests

**Date:** 2026-07-01
**Status:** complete

## Scope

Generate NIP-5A snapshot manifest templates during `napplet deploy --dry-run` when a local signer pubkey is available. This slice fixes snapshot plan items so each snapshot is paired with the root or named deploy target it snapshots.

Out of scope: network upload/publish, relay publish, `nbunksec`/bunker signing, CI revocable-key generation, and non-local signer pubkey discovery.

## Tasks

1. Make deploy plans carry snapshot source metadata.
   - Add snapshot companions for each selected root/named deploy target.
   - Keep snapshot items explicit about their source kind and d tag.

2. Pass local signer pubkeys into manifest template generation.
   - Resolve local signer before template creation when possible.
   - Build snapshot templates from their source root/named templates.
   - Keep unsupported signer modes skipped with an explicit reason.

3. Sign generated snapshot templates with the same local signer.

4. Update focused tests and CLI README wording.

## Verification

- `deno fmt --check packages/cli`
- `deno lint packages/cli`
- `pnpm --filter @napplet/cli build`
- `pnpm --filter @napplet/cli test:unit`
- temp CLI dry-run with `--root --snapshot --sec`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm dlx aislop@0.12.0 scan --json .`
- `git diff --check`
