---
status: resolved
trigger: "a workflow failed on 226"
---

# PR #226 tutorial metadata check

Expected: CI accepts the publishing metadata introduced in PR #226.

Observed: `ci` fails while conformance, link-check and AI-slop pass. Local `node scripts/test-tutorial.mjs` reproduces `Built HTML must not contain invented napplet-* protocol metadata` at `assertOutput`.

Cause: the tutorial smoke test retains a blanket ban on `napplet-*` meta elements. That ban conflicts with the living [NIP-5D HTML Metadata for Publishing](https://github.com/nostr-protocol/nips/pull/2303) mappings already reviewed for this PR. The previous local verification ran workspace unit tests but missed the tutorial smoke test included by CI's `pnpm test`.

Confirmed by [failed CI job](https://github.com/napplet/web/actions/runs/37642738304/job/112865125499). Replaced the blanket ban with tutorial-specific assertions for the named identifier, title, description, required domains and final HTML hash. Retained the existing self-contained asset checks. The HTML is parsed inertly with the existing happy-dom development dependency.

Verification: `pnpm test` passed, including the complete unit suite, release/skills contracts, tutorial build and browser conformance (5 passed, 0 failed, 6 skipped). `pnpm build` and `pnpm type-check` passed. No package output changes or additional changesets are needed. The original unrelated worktree changes remain untouched.
