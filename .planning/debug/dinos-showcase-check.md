---
status: verifying
trigger: "Merged DinOS listing fails Link check workflow run 41182473193; open a PR that passes."
created: 2026-10-31
updated: 2026-10-31
---

# DinOS showcase check

## Symptoms

Expected: the shell listing addition passes the complete Link check workflow. Actual: `scripts/check-showcase.mjs:29` reports two network mentions where the homepage editorial contract allows one. The internal link crawl passed; the showcase assertion stopped the remaining browser checks.

## Evidence

- GitHub run 41182473193 failed on the PR head e5f7ee44 with `AssertionError: one explanatory network mention`, `2 !== 1`.
- The existing showcase check counts visible whole-word mentions across the homepage. The new DinOS description added the second mention.
- The website README documents the single below-fold network explanation. Previous verification checked only the new row and missed this full-page contract.
- Reproduced locally on a fresh build of merged main with the unchanged `check-showcase.mjs`: `2 !== 1` at line 29.

## Current Focus

The one-line copy fix is committed as `0a2bcb4b`; local verification passed. Next action: await the actual pull-request Link check workflow. No protocol behavior or published package changes are needed.

## Resolution

Changed the DinOS sentence to use “your account,” preserving the existing homepage editorial contract, test assertion, shell metadata, and project URLs.

Local verification passed:

- `pnpm build`: 12 tasks.
- `pnpm type-check`: 19 tasks.
- `pnpm -r test:unit`.
- Explicit web, docs and conformance builds with the workflow's deployment base.
- Site assembly tests and assembly, plus verification of 44 protocol detail pages.
- Concurrent development-server browser checks.
- Complete static-site sequence: 74 internal links; showcase at 1440, 390 and 320px including playable apps, motion and no-JavaScript content; app store; protocol browser at the same widths and without JavaScript.
- Pinned AI-slop scanner 0.12.0: 100/100, zero errors or warnings.
- `git diff --check`.

The existing showcase check provided the regression test: it failed before the copy change and passed afterward without modification. No changeset is needed for private website copy.
