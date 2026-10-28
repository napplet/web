---
quick_id: 261026-iwr
status: complete
---

# Default deploy screenshots and Zapstore events

`napplet deploy` now captures one PNG per distinct selected build and prepares a kind 32267 Software Application event by default. `--no-screenshot` keeps the event but skips new capture; `--no-zapstore` skips the event and automatic capture. A missing `zapstore` object is filled from selected manifest metadata without writing config. Existing `enabled: false` and `--zapstore` override behavior remain available.

Removed the CLI's proposed `app` manifest tag linkage. The current NIP-5D manifest specification does not define it, so the application event stays separate from signed napplet manifests. See [NIP-5D at the current PR head](https://github.com/nostr-protocol/nips/pull/2303) and the [Software Applications proposal](https://github.com/nostr-protocol/nips/pull/1336).

Verification: `pnpm build` (12 tasks), `pnpm type-check` (19 tasks), `pnpm -r test:unit` (all workspaces), and focused CLI tests (30 passing) succeeded. A compiled macOS CLI dry run with no screenshot or Zapstore enable flags captured a PNG, produced a kind 32267 event with an `image` tag, and produced a kind 35129 manifest without an `app` tag. The broader opt-in compiled smoke test stopped at its hosted boilerplate archive download (`@napplet/boilerplate: fetch failed`) before reaching deploy; its separate config migration test passed.

The pinned AI-slop 0.12.0 scan scored 80/100, above the workflow's minimum score of 70. Its five findings concern unchanged conformance nesting and existing dependency advisories; no finding points to this task's files.

Implementation commit: `ee144357`.
