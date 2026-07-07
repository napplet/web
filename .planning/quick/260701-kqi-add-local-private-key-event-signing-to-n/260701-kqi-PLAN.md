# Quick Task 260701-kqi: Add local private-key event signing to @napplet/cli dry-run deploy output

**Date:** 2026-07-01
**Status:** complete

## Scope

Sign dry-run deploy manifest templates with local private keys when the CLI can resolve a local secret from `--sec`, `--prompt-sec`, or a stored key reference. This slice does not implement nbunksec/bunker signing, CI revocable-key generation, blob upload, or relay publishing.

## Tasks

1. Add local signer primitives.
   - Decode hex and `nsec` private keys.
   - Produce NIP-01 signed events from unsigned templates.
   - Expose signer pubkey for future snapshot source-address wiring.

2. Wire deploy dry-run signing.
   - Sign root/named templates when local private-key signing is available.
   - Retrieve stored local keys through the native key-store provider.
   - Keep unsupported signer modes explicit and unsigned.

3. Declare the existing `nostr-tools` runtime dependency for `@napplet/cli`.

4. Add focused unit tests for hex/nsec decoding and dry-run manifest signing.

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
