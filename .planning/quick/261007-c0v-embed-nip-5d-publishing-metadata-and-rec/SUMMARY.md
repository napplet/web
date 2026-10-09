---
status: complete
---

# HTML publishing metadata

Implemented in `d8e86e34` and `4b9cbc79` on `feat/html-publishing-metadata`. Canonical reference: [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303), reviewed head `020cb8b33a9e4c6b8ca4b2f9d0ed0a67843b68f7`. This is implementation evidence, not a protocol specification.

The Vite plugin embeds resolved named-event publishing metadata before artifact hashing. Structural parsing preserves unrelated head/source content, keeps encoding declarations early, and distinguishes declarations from scripts, comments, templates and body markup. Configuration precedence and opt-in capability inference are documented. Icon byte input produces a data URL and matching content hash; existing hash-only callers remain compatible with an explicit warning when bytes cannot be recovered.

CLI deployment recovers metadata without a sidecar, honors configuration and target overrides, derives icon hashes from decoded data URLs, and uploads the same bytes without writing extracted files. Reports show resolved upload destinations without dumping binary data. Existing legacy-format behavior and runtime/conformance acceptance remain intact. The plugin emits named events only; companion snapshots retain the CLI's selected source provenance. NAP-CONFIG has no canonical HTML mapping and stays sidecar-only.

## Verification

- `pnpm build`: 12 tasks passed, including all five standalone CLI compilation targets.
- `pnpm type-check`: 17 tasks passed.
- `pnpm -r test:unit`: 552 tests passed, including 54 plugin and 150 CLI tests.
- `pnpm test:convention-contracts`: passed.
- `pnpm check:jsr`: passed; parser imports declared for npm and JSR consumers.
- Real Vite build, remove sidecar, CLI discovery/manifest construction and upload payload collection: metadata matched the plugin event, and HTML/icon payload hashes matched the uploaded bytes.
- Supported PNG/JPEG/WebP fixtures are real 1-pixel images with independently computed hashes. Tests cover escaping, CR/LF preservation, duplicate/stale declarations, inferred optional domains, abbreviated HTML, kind restrictions, explicit overrides and absent optional metadata.
- AI-slop 0.12.0 full scan: 73/100, passes the configured minimum of 70. Existing findings are oversized `cli.ts`/`output.ts`, a long release-tooling function and four dependency advisories. No rule changes. Changed-file scans scored 78 before the final CLI report changes.

Minor changesets are pending for `@napplet/vite-plugin` and `@napplet/cli`; packages were not published locally. Original-worktree WIP was left untouched.

## Shipping

Opened [PR #226](https://github.com/napplet/web/pull/226) with the two package changesets. Git push initially returned internal server errors; the Git data API reproduced and published the exact local commits, verified by matching commit and file-tree hashes. PR creation succeeded after retrying the transient GitHub API failure.

## CI follow-up (2026-10-09)

CI exposed an obsolete tutorial smoke-test ban on every `napplet-*` meta element. The initial verification omitted `pnpm test:tutorial`, which CI runs through `pnpm test`. Replaced that ban with tutorial metadata/manifest consistency and final-byte hash assertions. The complete `pnpm test`, build and type-check commands now pass locally. See [debug record](../../debug/resolved/pr226-tutorial-metadata.md).
