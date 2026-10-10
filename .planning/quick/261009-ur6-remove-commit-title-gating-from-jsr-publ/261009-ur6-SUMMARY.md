---
status: complete
---

# JSR publication follows package versions

Removed the commit-title job condition. Every main push now reaches the existing JSR publisher, which skips published versions and publishes missing versions. Manual dispatch, serial workspace publishing, OIDC permissions, and non-cancelling workflow concurrency remain available. Added workflow regression coverage to PR CI and updated publishing documentation. No package output changes; no changeset required.

Evidence: recovery run https://github.com/napplet/web/actions/runs/38026404387 published CLI 0.8.3 and reported already-published skips for the other six packages. The new regression test failed on the old title guard and passes after removal.

Verification: `pnpm test:workflow-contracts` (5 pass), `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, and `git diff --check` pass. Changed-file AI-slop scan scored 100/100 (no production source files changed). No registry publications were performed for this fix.

Commit: d798a91f
