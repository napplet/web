---
quick_id: 260710-mzr
description: Move Core Concepts to the top of the affected docs section
status: planned
date: 2026-07-10
---

# Quick Task 260710-mzr: Move Core Concepts to the top of the affected docs section

## Goal

Make the docs sidebar show `Core concepts` first within the `Getting Started`
section so readers see the conceptual primer before tutorial paths.

## Tasks

1. Reorder the `apps/docs/.vitepress/config.ts` sidebar entry for
   `Core concepts` above `Getting started`.
2. Verify the docs config builds and the diff is whitespace-clean.

## Verification

- `pnpm --filter @napplet/docs build`
- `git diff --check`
