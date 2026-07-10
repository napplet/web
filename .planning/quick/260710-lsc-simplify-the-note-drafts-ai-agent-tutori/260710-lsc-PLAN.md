---
quick_id: 260710-lsc
status: complete
created: 2026-07-10
---

# Quick Task 260710-lsc: Simplify the Note Drafts AI-Agent Tutorial Prompt

## Goal

Make the Note Drafts AI-agent tutorial demonstrate that `@napplet/skills`
carries the napplet protocol/build knowledge, so the user prompt only needs to
name the product scope and run evidence expectations.

## Tasks

1. Update `apps/docs/guide/build-note-drafts-napplet-with-ai-agent-and-skills.md`
   so the example prompt is short and product-focused.
2. Reframe the domain/boundary/verification details as what the installed
   skills infer and what the user reviews, rather than details the user must
   paste.
3. Verify the docs build and basic diff hygiene, then record evidence in the
   quick-task summary.

## Verification

- `pnpm --filter @napplet/docs build`
- `git diff --check`
- staged `aislop` scan
