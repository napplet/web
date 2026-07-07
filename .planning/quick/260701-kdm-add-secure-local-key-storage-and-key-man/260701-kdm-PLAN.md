# Quick Task 260701-kdm: Add secure local key storage and key-management commands to @napplet/cli

**Date:** 2026-07-01
**Status:** complete

## Scope

Add native secure key storage primitives and CLI key-management commands for interactive/local signing. This does not implement Nostr signing, NIP-46 nbunksec generation, encrypted fallback storage, or network deploy.

## Tasks

1. Add platform keychain provider abstraction.
   - Files: `packages/cli/src/key-store.ts`, `packages/cli/src/process.ts`, `packages/cli/src/mod.ts`
   - Verify: unit tests cover macOS, Windows, Linux command shapes and unavailable-provider behavior.

2. Add key-management command surfaces.
   - Files: `packages/cli/src/cli.ts`, `packages/cli/src/signing.ts`, `packages/cli/tests/*`
   - Verify: command tests cover `keys store/list/delete/doctor` with mocked provider behavior where possible.

3. Update docs and release metadata.
   - Files: `packages/cli/README.md`, `.changeset/*`
   - Verify: docs state that storage uses native keychains and fails closed when unavailable.

## Verification

- `deno fmt --check packages/cli`
- `pnpm --filter @napplet/cli build`
- `pnpm --filter @napplet/cli test:unit`
- `git diff --check`
