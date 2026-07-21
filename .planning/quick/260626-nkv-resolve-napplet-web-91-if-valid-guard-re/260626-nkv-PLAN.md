---
quick_id: 260626-nkv
status: completed
created: 2026-06-26
must_haves:
  truths:
    - napplet/web#91 is valid: relay query resolves result.events directly.
    - The public contract remains Promise<NostrEvent[]>.
    - Outbox already guards missing/non-array events to an empty array.
  artifacts:
    - Relay shim regression test.
    - Relay shim guard.
    - Patch changeset for shipped package output.
  key_links:
    - https://github.com/napplet/web/issues/91
---

# Quick Task 260626-nkv: Guard Relay Query Events

## Task 1: Lock the malformed result case

Files: `packages/nap/src/relay/shim.test.ts`.

Action: Add a regression test proving `query()` resolves `[]` when `relay.query.result` omits `events`.

Verify: The focused test fails before the implementation guard and passes after it.

Done: The issue is covered by a focused unit test.

## Task 2: Add the narrow guard

Files: `packages/nap/src/relay/shim.ts`.

Action: Resolve `Array.isArray(result.events) ? result.events : []` for successful query results.

Verify: Focused relay shim tests pass.

Done: The shim preserves `Promise<NostrEvent[]>` even when a host omits or corrupts `events`.

## Task 3: Release metadata and PR

Files: `.changeset/**`, `.planning/STATE.md`, quick summary.

Action: Add patch changesets for packages with shipped output, run repo gates, commit, push, and open a PR that resolves #91.

Verify: Build/type/unit/static checks pass and GitHub PR readback confirms the issue-closing PR is open.

Done: PR is open with verification evidence.
