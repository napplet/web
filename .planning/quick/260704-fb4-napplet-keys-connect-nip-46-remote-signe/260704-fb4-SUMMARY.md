---
phase: quick-260704-fb4
status: incomplete
autonomous: false
---

# Quick Task 260704-fb4 — `napplet keys connect` (NIP-46 remote-signer login)

**Status:** automated tasks COMPLETE; one human-only live checkpoint OUTSTANDING.
**Date:** 2026-07-04
**Branch:** feat/napplet-cli

## What was built

Added `napplet keys connect`, a NIP-46 remote-signer login for the Deno CLI, using
nostr-tools (no applesauce). Prints a `nostrconnect://` QR to the terminal and races
a QR-scan wait against a pasted `bunker://` URL; on success it encodes an nbunksec,
stores it in the OS keychain, and points `.napplet` `signing.keyReference` at it —
mirroring the existing `keys store` + `keys use` lifecycle.

## Commits (scope `cli`)

| Commit | Task | Change |
|--------|------|--------|
| `294214d` | 1 | New `packages/cli/src/nostr-connect.ts` (nostrconnect QR + bunker:// paste race over one shared pool; encodes nbunksec via existing `encodeNbunksec`) + `tests/nostr_connect_test.ts` (4 tests, in-memory fake NIP-46 remote, no real relays). Pinned `jsr:@libs/qrcode@^3.0.1` + `jsr:@std/streams@^1`. |
| `1a50635` | 2 | Wired `connect` subcommand into `commandKeys`: stores nbunksec in keychain + sets `signing.keyReference`; added to HELP. |
| `c249f5d` | 4 | README section + `@napplet/cli` minor changeset. |
| `7a6fab8` | — | Split `connectRemoteSigner` into scan/paste helpers (clears AI-slop function-length warning). |

Files: `packages/cli/src/nostr-connect.ts` (new, ~345 lines), `packages/cli/src/cli.ts`,
`packages/cli/deno.json`, `packages/cli/deno.lock`, `packages/cli/tests/nostr_connect_test.ts`,
`packages/cli/README.md`, `.changeset/napplet-keys-connect.md`.

## Verification (re-run on merged tree)

- `deno task check` — green (src/cli.ts, src/mod.ts).
- `deno task test:unit` (NAPPLET_TEST_MODE=true) — **49 passed | 0 failed**, incl. the 4 new
  nostr-connect tests (buildPerms, detectBunkerLine, renderQrMatrix, connectRemoteSigner via
  pasted bunker:// with injected fake pool + injected stdin). No real relays contacted.
- `napplet keys help` shows `napplet keys connect --name <ref> [--relay <url> ...] [--config <file>]`.
- AI-slop gate: 89/100, 0 errors (7 warnings all pre-existing/environmental, none in new files).
- Protocol grep: zero NIP-5D/NAP/`napplet-*`/conformance surface introduced.

## Decisions / deviations

- Pinned qrcode `^3.0.1` (plan's `^0.2` was stale).
- `perms` passed to `createNostrConnectURI` as `string[]` per nostr-tools 2.23.3 source (not `.join(",")`).
- `keys connect` **requires `--name`** (no stdin name-prompt) to avoid contending with the
  bunker:// paste stdin race — minor UX deviation, no functional gap.
- JSR-only deps live in `deno.json` only per existing repo convention (package.json cannot express
  jsr specifiers); documented in README. package.json unchanged.

## Flagged (out of scope)

- Pre-existing manifest-kind discrepancy: `types.ts` uses `5129/15129/35129` while STATE quick-task
  260701-kla claims canonical `5128/15128/35128`. Not touched by this task — surfaced for follow-up.

## OUTSTANDING — human-only live checkpoint (Task 3)

The live NIP-46 connect needs a real relay + a phone/NIP-46 signer and cannot be unit-tested. To verify:

1. From `packages/cli`: `deno task dev keys connect --name test-remote` (or `deno run --allow-read --allow-write --allow-run --allow-env --allow-net src/cli.ts keys connect --name test-remote`).
2. Confirm a scannable QR renders with a quiet-zone border.
3a. Scan with a NIP-46 signer (Amber / nsec.app) and approve — flow completes; **OR**
3b. Paste a `bunker://...` URL and press enter — flow completes (whichever wins, the other is cancelled and the QR is cleared).
4. Confirm output reports stored ref + configured keyReference + remote pubkey; `napplet keys list` shows `test-remote`; `.napplet` has `signing.keyReference = "test-remote"`.
5. Confirm the stored session signs: run a `napplet deploy --dry-run` (or debug) that uses the stored key and see the remote round-trip.

Resume signal: "approved", or describe issues (QR unscannable, race not cancelling, sign-time round-trip fails).
