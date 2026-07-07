# Quick Task 260701-l4f Summary

## Result

`@napplet/cli` now accepts nsyte-compatible `nbunksec` signing material for dry-run and network deploy signing. The deploy path uses one async signer interface for local `hex`/`nsec` keys and remote NIP-46 signers, so manifest events and Blossom upload authorization events can be signed through the same flow.

## Changed Files

- `.changeset/napplet-cli-nbunksec-signing.md`
- `packages/cli/README.md`
- `packages/cli/src/cli.ts`
- `packages/cli/src/deploy-network.ts`
- `packages/cli/src/signing.ts`
- `packages/cli/tests/deploy_network_test.ts`
- `packages/cli/tests/signing_test.ts`

## Verification

- `deno fmt packages/cli`
- `deno fmt --check packages/cli`
- `deno lint packages/cli`
- `pnpm --filter @napplet/cli build`
- `pnpm --filter @napplet/cli test:unit`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm dlx aislop@0.12.0 scan --json .` returned 0 errors and the repo's existing 7 warnings.
- `git diff --check`

## Notes

- No new dependencies were added; the narrow nbunksec bech32/TLV handling is local.
- Raw `bunker://` pairing remains out of scope and errors with guidance to use `nbunksec`.
- Live signing against a real bunker session remains untested.
