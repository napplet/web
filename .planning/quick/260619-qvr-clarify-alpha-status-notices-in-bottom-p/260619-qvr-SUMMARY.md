---
phase: quick
plan: 260619-qvr
subsystem: apps/web landing page
status: complete
completed: 2026-06-19
tags: [alpha-notice, web, boilerplate]
---

# Quick 260619-qvr: Clarify alpha status notices

## What changed

- Added a prominent alpha-development notice above the landing-page package grid.
- Added a blur-backed acknowledgement modal over the boilerplate install section.
- The boilerplate gate uses the requested warning text and an `I Understand` button.
- The install command and section links become usable after acknowledgement.

## Files changed

- `apps/web/src/sections/Packages.svelte`
- `apps/web/src/sections/GetStarted.svelte`

## Verification

- `pnpm --filter @napplet/web type-check` -> 0 errors / 0 warnings.
- `pnpm --filter @napplet/web build` -> green.
- Playwright against a production preview -> package notice visible, boilerplate modal
  visible, install content is `inert` while locked, `I Understand` dismisses it, copy
  command is visible afterward.
- Mobile Playwright viewport `390x844` -> package notice and modal visible, modal card fits.
- `pnpm build` -> 12 tasks successful.
- `pnpm type-check` -> 16 tasks successful.
- `pnpm -r test:unit` -> 29 files / 210 tests passed.
- `pnpm lint` -> exits 0; Turbo reports no configured lint tasks.
- `pnpm dlx aislop scan --json .` -> non-zero only because of known dependency
  advisories for `vite` and `js-yaml`; score 89 / Healthy with 0 format, lint,
  code-quality, or AI-slop issues.
- `git diff --check` -> clean.

## Notes

- No changeset: this changes the private `@napplet/web` landing page only, not a
  published package.
