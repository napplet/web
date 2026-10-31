---
status: complete
---

# DinOS shell listing

Added DinOS to the homepage shell directory with the supplied GitWorkshop URL for both the project and source links, a Linux platform label, active-development status, and a short editorial description. The current project README describes DinOS as the Linux system built around the Din desktop. Website curation notes link that evidence. No launch template or protocol claim was added, and no published package changed.

Implementation commit: `b7bf6c66`.

Verification:

- `pnpm build`: passed, 12 tasks. The first run overlapped dependency builds from the type-check command and failed on a temporarily missing SDK declaration; the sequential retry passed.
- `pnpm type-check`: passed, 19 tasks.
- `pnpm -r test:unit`: passed.
- Playwright against the built homepage at desktop 1440px and mobile 390px: one DinOS entry, correct source URL, Linux label, active-development status, and row within viewport; JavaScript disabled in both runs. Screenshots: `/tmp/napplet-dinos-1440.png`, `/tmp/napplet-dinos-390.png`.
- `aislop@0.12.0 scan --changes --base origin/main --json`: 100/100, zero errors or warnings. Used the already-installed pinned scanner after package-runner registry requests failed.
- `git diff --check`: passed.

Worktree: `/Users/sandwich/.worktrees/napplet/dinos-shell`, branch `docs/dinos-shell`, based on fetched `origin/main`. The original checkout and its unrelated changes were left untouched. No changeset is needed for private website content.
