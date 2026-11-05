---
status: resolved
trigger: "The icon is missing from the local dev server in the worktree."
created: 2026-10-22
updated: 2026-10-22
---

# Local development icon

Root cause: port 61520 was served by `node scripts/dev-site.mjs` (PID 29962) in `/Users/sandwich/Develop/napplet-showcase`. That clean checkout remained at `060f5ed5`, before the icon commits pushed to PR #221 from an isolated worktree. Its local startup fixes were already represented by the remote squash commit, so the tree difference consisted only of icon changes and their planning records.

Resolution: merged `origin/feat/astro-ecosystem-showcase` into the local branch, preserving local commits. The resulting source tree exactly matched the PR head. The previous server process was no longer running when browser verification began; restarted `pnpm dev:site`, which allocated website port 62358 and docs port 62353.

Verification: Playwright checked the live homepage, protocol directory, explainer and redirected docs page. Every page rendered the supplied duck logo, and each favicon returned HTTP 200 with bytes matching the supplied PNG. Homepage screenshot: `/tmp/napplet-local-dev-duck.png`. No source changes or dependency changes were needed; build/type/unit verification for the same source tree is recorded in quick task 261022-8da.
