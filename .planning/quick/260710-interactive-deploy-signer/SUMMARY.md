# Interactive deploy signer fallback summary

## Result

`napplet deploy` no longer exits immediately when no signer flag is provided.
For network deploys it now resolves signers in this order:

1. explicit `--sec` / `--prompt-sec`
2. configured stored key reference
3. configured bunker pubkey / npub looked up in the native key store
4. interactive Nostr Connect pairing in a terminal

The interactive path stores the resulting `nbunksec` under the remote pubkey
when a native key store is available, writes `.napplet/config.json`, and still
continues the current deploy even when storage is unavailable.

## Verification

- `deno task --cwd packages/cli check`
- `deno task --cwd packages/cli test:unit` - 76 passed
- `deno fmt --check` on touched CLI TypeScript files
- `deno lint packages/cli/src packages/cli/tests`
- `pnpm --filter @napplet/cli build`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm lint` - no lint tasks configured
- `pnpm test:tutorial` - conformant, 5 pass / 0 fail / 5 skip
- `git diff --check`
- `pnpm dlx aislop@0.13.1 scan --changes --json .` - 100 / 100
- PTY smoke from `/home/sandwich/Develop/gbcolor-napplet`:
  `napplet deploy` entered Nostr Connect and waited instead of throwing the
  previous signer error.

## Notes

- `pnpm dlx aislop@0.12.0 scan --changes .` remains 98 / 100 because that
  older scanner reports the existing `js-yaml` dependency warning from
  `package.json`; no formatting, lint, code-quality, or AI-slop findings were
  reported for this change.
- `deno fmt --check packages/cli` still flags pre-existing changelog wrapping;
  the touched TypeScript files are formatted.
