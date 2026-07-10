---
quick_id: 260710-lai
status: planned
date: 2026-07-10
---

# Quick Task 260710-lai: Note Drafts tutorial variants

## Goal

Update the existing Note Drafts tutorial title and add two new guide tutorials:

- `Tutorial: build a Note Drafts napplet from boilerplate`
- `Tutorial: build a Note Drafts napplet with an AI Agent and @napplet.skills`

## Tasks

1. Update docs navigation and existing tutorial title.
   - Files: `apps/docs/guide/build-note-drafts-napplet.md`, `apps/docs/guide/getting-started.md`, `apps/docs/.vitepress/config.ts`
   - Verify: `rg "Tutorial: build a Note Drafts napplet" apps/docs`

2. Add the two new tutorial pages.
   - Files: `apps/docs/guide/build-note-drafts-napplet-from-boilerplate.md`, `apps/docs/guide/build-note-drafts-napplet-with-ai-agent-and-skills.md`
   - Verify: docs build resolves both pages and sidebar links.

3. Run repository checks appropriate for docs changes.
   - Verify: `pnpm type-check`, `pnpm build`, `pnpm test:tutorial`, `pnpm check:links`, AI-slop gate if available.
