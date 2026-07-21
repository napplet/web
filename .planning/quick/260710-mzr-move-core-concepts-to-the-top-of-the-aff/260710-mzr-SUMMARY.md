---
quick_id: 260710-mzr
status: complete
date: 2026-07-10
commit: bc4cd533
---

# Quick Task 260710-mzr Summary

## Result

Moved `Core concepts` to the first item in the `Getting Started` sidebar group
in `apps/docs/.vitepress/config.ts`.

## Changed Files

- `apps/docs/.vitepress/config.ts`

## Verification

- `pnpm --filter @napplet/docs build` - passed
- `git diff --check` - passed
- `pnpm build` - passed, 13 tasks
- `pnpm type-check` - passed, 17 tasks
- `pnpm -r test:unit` - passed
- `pnpm lint` - passed with 0 configured tasks
- `pnpm dlx aislop@0.12.0 scan --changes --base origin/main .` - passed with 98/100; only warning is the existing `js-yaml` advisory

## Notes

- No protocol, package API, or tutorial prose changed.
