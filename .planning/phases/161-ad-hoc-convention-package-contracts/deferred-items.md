# Deferred Items

## 2026-07-23 — AI-slop gate findings outside Plan 161-04 scope

- `packages/core/src/types/global/service-api.ts`: existing 612-line file exceeds the 400-line quality threshold.
- `packages/core/src/topics.ts`: existing narrative-comment warning.
- Root `package.json` / `pnpm-lock.yaml`: existing high-severity `js-yaml` dependency advisory.

These files were not modified by Plan 161-04. The plan's CLI convention migration remains verified by its Deno suite and contract scan.
