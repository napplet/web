# Quick Task 260701-kla: Add NIP-5D/NIP-5A deploy event-building primitives to @napplet/cli

**Date:** 2026-07-01
**Status:** complete

## Canonical Sources Checked

- NIP-5D PR #2303, opened live on 2026-07-01.
- NIP-5A `master` raw text, opened live on 2026-07-01.

## Scope

Add Deno-native deploy manifest/event-template primitives for the CLI, grounded in NIP-5A root/named/snapshot manifest kinds and aggregate-hash rules. This slice remains dry-run only: it does not sign events, upload blobs, or publish to relays.

## Tasks

1. Correct CLI deploy constants to the NIP-5A values used by NIP-5D.
   - Root `15128`
   - Named `35128`
   - Snapshot `5128`

2. Add a Deno-native manifest builder.
   - Enumerate candidate files.
   - Compute per-file sha256 hashes.
   - Compute aggregate hash from sorted `"<sha256> <absolute-path>\n"` lines using only path tags.
   - Build root/named event templates with `path`, `x`, and `server` tags.
   - Build snapshot templates from root/named templates when a pubkey is available.

3. Wire dry-run deploy output to include unsigned event templates.
   - Keep non-dry-run blocked until signing/upload/publish are implemented.

4. Add focused unit tests for aggregate hashing, kind/tag shape, d-tag validation, and dry-run template expansion.

## Verification

- `deno fmt --check packages/cli`
- `deno lint packages/cli`
- `pnpm --filter @napplet/cli build`
- `pnpm --filter @napplet/cli test:unit`
- `git diff --check`
