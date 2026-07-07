# Quick Task 260701-lvc: Add CLI Debug Status Command

**Date:** 2026-07-01
**Status:** complete

## Scope

Add a read-only `napplet debug` command that prints JSON operator diagnostics for the current `.napplet` project without uploading files, publishing events, storing secrets, or adding protocol surface.

The command should reuse existing config, discovery, deploy-plan, manifest-template, and signing classification helpers.

Out of scope: live Blossom/relay probing, raw `bunker://` pairing, profile/server/app publishing, and destructive sync/delete flows.

## Tasks

1. Add `debug` to CLI help and command routing.
2. Build a JSON payload with config path, configured roots/relays/servers, discovered candidates, deploy plan summary, manifest template summary, and signing method classification.
3. Keep secrets out of output; classify only signer source/type and whether it can sign with current inputs.
4. Add focused Deno tests and README/update release metadata.

## Outcome

- Added `napplet debug` as a read-only JSON diagnostics command.
- Reused existing config, discovery, deploy-plan, manifest-template, and signing classification code paths.
- Added sanitized signing diagnostics and used them for both debug output and deploy JSON output so direct CI signing material is not echoed.
- Documented the command and added a changeset for `@napplet/cli`.

## Verification

- `deno fmt packages/cli`
- `deno fmt --check packages/cli`
- `deno lint packages/cli`
- `pnpm --filter @napplet/cli build`
- `pnpm --filter @napplet/cli test:unit`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm dlx aislop@0.12.0 scan --json .`
- `git diff --check`

## Remaining Risk

- Debug does not probe live Blossom server or relay availability; that needs separate timeout and credential semantics.
