---
status: resolved
trigger: "ci failed in 289"
created: 2026-11-01
updated: 2026-11-01
---

# PR 289 catalog snapshot timeout

## Symptoms

Expected: PR 289 CI passes. Actual: CI run 41289284446 fails in `pnpm test`; the catalog snapshot test exceeds Vitest's default 5,000 ms timeout. Other PR checks pass.

## Current Focus

Hypothesis: increasing the saved snapshot from 135 to 644 events pushes real signature verification over the default timeout on the shared CI runner.

Next action: push the verified fix to the existing PR branch and confirm GitHub checks.

## Evidence

- CI reports 5,147 ms for the snapshot test and no assertion failure; the other 41 web tests pass.
- Running the unchanged catalog test file locally passes all 14 tests; the snapshot test takes 691 ms.
- `catalogApp` verifies each event signature before applying catalog filters. This test intentionally covers every saved event; no signatures are mocked.
- The PR worktree is clean at `9f6e793c`, matching the remote branch. The main workspace has unrelated Soulseek and workspace changes, which remain untouched.

## Resolution

The full-snapshot test now has a bounded 30-second timeout with an explanatory comment. Every assertion and real signature check remains intact; other tests retain the default timeout.

Verification: `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, `pnpm test`, `pnpm test:workflow-contracts`, and `git diff --check` pass. Web tests: 42/42. The pinned `aislop@0.12.0` scan reports 100/100, zero errors and warnings across 358 files. The scanner ran from the local npm cache after the `npx` registry lookup failed with `EBADF`.

This is a test timing change; it changes no runtime behavior, protocol requirement, public documentation, or shipped package output and needs no changeset.
