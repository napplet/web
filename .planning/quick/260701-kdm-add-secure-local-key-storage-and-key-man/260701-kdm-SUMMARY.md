# Quick Task 260701-kdm Summary

**Task:** Add secure local key storage and key-management commands to `@napplet/cli`
**Date:** 2026-07-01
**Status:** complete
**Implementation commit:** `8b2e1e47` (`Support local signing without plaintext key files`)

## Completed

- Added `packages/cli/src/key-store.ts` with native secure-storage provider abstraction:
  - macOS Keychain via `security`
  - Windows Credential Manager via `cmdkey` and PowerShell `CredRead`
  - Linux Secret Service via `secret-tool` with a D-Bus session
- Added fail-closed provider discovery through `getKeyStoreProvider()` and `requireKeyStoreProvider()`.
- Extended process execution to support piped stdin for backends such as `secret-tool store`.
- Added `napplet keys store/use/list/delete/doctor`.
- Added `.napplet` signing reference update support through `setSigningKeyReference()`.
- Updated CLI README and changeset metadata for the new key command family.
- Added unit coverage for unavailable provider behavior and macOS/Linux/Windows command shapes.

## Verification

- `deno fmt --check packages/cli` — pass
- `deno lint packages/cli` — pass
- `pnpm --filter @napplet/cli build` — pass
- `pnpm --filter @napplet/cli test:unit` — pass, 17 tests
- `pnpm build` — pass, 13 tasks
- `pnpm type-check` — pass, 17 tasks
- `pnpm -r test:unit` — pass, all workspace unit suites
- `git diff --check` — pass
- `pnpm dlx aislop@0.12.0 scan --json .` — pass with 0 errors; remaining warnings are inherited outside this CLI slice

## Remaining Scope

- Real event signing is still not implemented.
- Network upload/publish remains dry-run only.
- CI revocable-key generation / nbunksec workflow remains pending.
- Real OS keychain behavior still needs manual validation on macOS, Windows, and Linux desktop sessions.
