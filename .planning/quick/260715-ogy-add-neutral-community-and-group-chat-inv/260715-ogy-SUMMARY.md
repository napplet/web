---
quick_id: 260715-ogy
status: complete
commit: ccc3796b
completed: 2026-07-15
---

# Quick Task 260715-ogy Summary

## Result

Added the provided invite as a neutral community/group-chat link in the SPA and
docs.

## Changed Files

- `apps/web/src/lib/site.ts`
- `apps/web/src/components/Nav.svelte`
- `apps/web/src/components/Footer.svelte`
- `apps/web/src/sections/Hero.svelte`
- `apps/web/src/sections/GetStarted.svelte`
- `apps/docs/.vitepress/config.ts`
- `apps/docs/index.md`
- `apps/docs/guide/index.md`
- `apps/docs/guide/getting-started.md`
- `apps/docs/packages/index.md`

## Simplifications

- Reused the existing `LINKS` object for SPA placements instead of repeating the
  URL in each Svelte component.
- Kept visible copy generic: `Community`, `Join community`, `Group chat`, and
  `community group chat`.
- Avoided adding any package changes or changesets because no publishable package
  output changed.

## Verification

- `pnpm --filter @napplet/web type-check`
- `pnpm --filter @napplet/web build`
- `pnpm --filter @napplet/docs build`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm lint` (0 tasks executed)
- `pnpm dlx aislop@0.13.1 scan --changes --json .` (100/100 Healthy)
- `git diff --check`
- `rg -n "Armada|Concord|concord chat" apps/web apps/docs --glob '!apps/docs/.vitepress/dist/**'` (no matches)

## Remaining Risks

- Browser screenshot/layout QA was not run; the nav breakpoint was widened to
  keep the extra nav item out of cramped desktop widths.
