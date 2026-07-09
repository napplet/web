---
status: planned
quick_id: 260709-rwi
date: 2026-07-09
---

# Quick Task 260709-rwi: Fix sparse JSR README pages for @napplet packages

## Plan

1. Compare live JSR package pages and local publish inputs for every publishable @napplet package.
2. Expand sparse package READMEs with JSR-facing installation, exports, and examples while staying non-normative on protocol text.
3. Verify README packaging/dry-run behavior, run repo quality gates appropriate for docs/package metadata, commit, push, and open a PR.

## Verification Targets

- Live JSR sparse pages identified before editing.
- Package dry-run/readme inclusion checked after editing.
- `git diff --check` and package checks pass.
