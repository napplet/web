# Quick Task 260701-kla Summary

**Task:** Add NIP-5D/NIP-5A deploy event-building primitives to `@napplet/cli`
**Date:** 2026-07-01
**Status:** complete
**Implementation commit:** `e0f96bd2` (`Ground deploy templates in canonical NIP-5A manifests`)

## Completed

- Corrected CLI deploy kind constants to canonical NIP-5A values:
  - root: `15128`
  - named: `35128`
  - snapshot: `5128`
- Added `packages/cli/src/manifest.ts` with Deno-native manifest primitives:
  - file enumeration
  - per-file SHA-256 hashing
  - path-only aggregate hash computation
  - root/named unsigned manifest templates
  - snapshot template construction when a signer pubkey is available
- Extended `napplet deploy --dry-run` output with unsigned manifest template data.
- Kept snapshots honest in dry-run: without a signer pubkey, snapshot entries report a skipped reason instead of fabricating the required `a` tag.
- Updated README and changeset metadata.
- Added unit tests covering hash collection, aggregate order-independence, root/named/snapshot tag shape, d-tag validation, and dry-run template expansion.

## Verification

- `deno fmt --check packages/cli` — pass
- `deno lint packages/cli` — pass
- `pnpm --filter @napplet/cli build` — pass
- `pnpm --filter @napplet/cli test:unit` — pass, 24 tests
- `pnpm build` — pass, 13 tasks
- `pnpm type-check` — pass, 17 tasks
- `pnpm -r test:unit` — pass, all workspace unit suites
- `git diff --check` — pass
- `pnpm dlx aislop@0.12.0 scan --json .` — pass with 0 errors; remaining warnings are inherited outside this CLI slice

## Protocol Notes

- Canonical NIP-5A live text was checked before implementation.
- The CLI no longer propagates the older `15129/35129/5129` values.
- Remaining protocol-fidelity follow-up: `@napplet/vite-plugin` still contains NIP-5D-specific `15129/35129` manifest constants and needs a separate sweep against current NIP-5D/NIP-5A canonical text before it is treated as protocol-correct.

## Remaining Scope

- Real event signing is still pending.
- Blob upload and relay publishing are still pending.
- Snapshot dry-run can build complete snapshot templates only after signer pubkey resolution is wired.
