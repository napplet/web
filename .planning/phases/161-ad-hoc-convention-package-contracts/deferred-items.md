# Deferred Items

## 2026-07-23 — AI-slop gate findings outside Plan 161-04 scope

- `packages/core/src/types/global/service-api.ts`: existing 612-line file exceeds the 400-line quality threshold.
- `packages/core/src/topics.ts`: existing narrative-comment warning.
- Root `package.json` / `pnpm-lock.yaml`: existing high-severity `js-yaml` dependency advisory.

These files were not modified by Plan 161-04. The plan's CLI convention migration remains verified by its Deno suite and contract scan.

## 2026-07-23 — Convention guard findings outside Plan 161-09 scope

- `packages/cli/README.md` and active guides under `apps/docs/guide/`: remaining `NAP-4` author guidance, owned by the planned 161-07/08 documentation sweep.
- `packages/sdk/src/nap-types.ts`: remaining `IntentContract` compatibility export, outside this plan's canonical skill ownership.

The Plan 161-09 packaged skills no longer teach the retired forms. Their focused
unit suite passes; the phase-wide convention guard remains blocked until those
other active surfaces are migrated.
