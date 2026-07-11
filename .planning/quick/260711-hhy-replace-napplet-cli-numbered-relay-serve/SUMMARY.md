---
status: complete
quick_id: 260711-hhy
date: 2026-07-11
commit: be89ec7d
---

# Quick Task 260711-hhy Summary

Replaced `@napplet/cli` numbered relay / Blossom selection with prompt
autocomplete and split Nostr Connect bunker relay selection from deploy relay
configuration.

## Completed

- Added shared URL prompt parsing/validation and Tab completion support in the
  terminal prompt helper.
- Updated `napplet init` to use relay and Blossom suggestions as autocomplete
  candidates, not numbered menu entries.
- Raised default relay and Blossom suggestion caps to 1200 for autocomplete and
  increased Blossom discovery seed relays from 4 to 24.
- Added shared bunker relay prompting for interactive deploy and
  `napplet keys connect` before QR rendering.
- Changed the Nostr Connect default relay to `wss://bucket.coracle.social` and
  removed `wss://relay.nsec.app`.
- Kept `.napplet` deploy relays out of the Nostr Connect fallback path.
- Updated CLI README and the existing CLI changeset.

## Verification

- `deno fmt packages/cli/src/prompt.ts packages/cli/src/url-prompt.ts packages/cli/src/init-wizard.ts packages/cli/src/suggestions.ts packages/cli/src/cli.ts packages/cli/src/nostr-connect.ts packages/cli/src/deploy-signer.ts packages/cli/src/bunker-relays.ts packages/cli/src/keys-command.ts packages/cli/tests/prompt_test.ts packages/cli/tests/init_wizard_test.ts packages/cli/tests/suggestions_test.ts packages/cli/tests/deploy_signer_test.ts packages/cli/tests/keys_command_test.ts`
- `deno test -A --config packages/cli/deno.json packages/cli/tests/prompt_test.ts packages/cli/tests/init_wizard_test.ts packages/cli/tests/suggestions_test.ts packages/cli/tests/deploy_signer_test.ts packages/cli/tests/keys_command_test.ts`
- `cd packages/cli && deno task check`
- `cd packages/cli && deno test --allow-read --allow-write --allow-run --allow-env tests/`
- `pnpm type-check`
- `pnpm build`
- `pnpm test:unit`
- `pnpm lint` (no Turbo lint tasks configured)
- `pnpm dlx aislop@0.12.0 scan --changes --json` (98/100; only finding is the existing `js-yaml` advisory)
- `git diff --cached --check`

## Remaining Risk

- Live phone-app QR approval against a real bunker signer was not exercised in
  this local run.
