---
quick_id: 261014-fuc
status: complete
---

# Summary

- Rewrote all `blossom:sha256:` references across 21 files to BUD-10 `blossom:<sha256>.<ext>` URIs, with BUD-10 links in scheme lists and `@see` tags in resource JSDoc.
- Commits: 48782cd0 (packages/docs/specs/skills), ff59db58 (archived planning).
- Verification: `pnpm type-check` green, `pnpm -r test:unit` green, non-docs build green; the docs (vitepress) build fails identically on unmodified main (local `vue` symlink env issue).
- Upstream conflict: canonical NAP-RESOURCE at napplet/naps#80 head 2529209 still names `blossom:sha256:<hex>` as canonical; it needs a matching revision.
