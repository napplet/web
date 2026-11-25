---
quick_id: 261125-mvx
slug: move-archetypes-to-own-repo
date: 2026-11-25
---

# Move the archetypes site and indexer out of napplet/web

The site and indexer now live in napplet/archetypes with their history, CI and deployment. Remove them here.

1. Delete `apps/archetypes` and `apps/archetypes-indexer`.
2. Delete the root `.dockerignore`, which existed only for the indexer image.
3. Drop the `check:site` step from `.github/workflows/ci.yml`.
4. Repoint the README package-table row at napplet/archetypes.
5. Regenerate `pnpm-lock.yaml`. Leave `apps/docs/naps/intent.md` (it links the live site) and the `.planning` history alone.
