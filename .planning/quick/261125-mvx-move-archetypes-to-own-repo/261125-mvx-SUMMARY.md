---
quick_id: 261125-mvx
slug: move-archetypes-to-own-repo
date: 2026-11-25
status: complete
branch: chore/move-archetypes-out
---

# Move archetypes out: summary

Removed `apps/archetypes`, `apps/archetypes-indexer` and the root `.dockerignore`, dropped the CI `check:site` step, pointed the README row at https://github.com/napplet/archetypes, and refreshed the lockfile (removals only). The new repository was extracted from the `feat/archetypes-site` history with `git filter-repo`, so it keeps the 14 granular commits. It has its own CI (type-check, unit tests, build, `check:site`, container build plus an in-image site build), and production deploys from its `main`.

## Verification

- `pnpm test:workflow-contracts`: 19 pass, 0 fail
- `pnpm type-check`: 21/21 tasks; `pnpm build`: 13/13 tasks
- `pnpm -r test:unit`: green
- aislop 0.12.0: 93/100, the same three dependency advisories as `main` (`@hono/node-server`, `@astrojs/svelte`, `astro`); the score moves only because the file count shrank
- In napplet/archetypes: 67 site and 86 indexer tests, identical to the counts here before removal; the built site differs from this repo's build only in source and curation links
