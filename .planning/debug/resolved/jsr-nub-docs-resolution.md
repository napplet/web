---
status: resolved
trigger: "$gsd-debug jsr publish is still failing https://github.com/napplet/napplet/actions/runs/26228838262"
created: 2026-05-21
updated: 2026-05-22
---

# JSR Nub Docs Resolution

## Current Focus

hypothesis: CONFIRMED - `@napplet/nub` published source had a docs-generation-only type edge to `json-schema`, and `@napplet/vite-plugin` had a later invalid JSR npm import range for `vite`.
test: Remove the `json-schema` published-source edge, keep the Vite plugin on the exported napplet schema type, and use a valid JSR npm import mapping.
expecting: `@napplet/nub` dry-run/docs checks pass, workspace checks stay green, and a real GitHub Actions rerun can publish `nub` before dependent packages resolve it from JSR.
next_action: Push the fix and rerun `Publish to JSR`; JSR docs say already-published versions are skipped, so `@napplet/core@0.3.0` should not block the rerun.

## Symptoms

expected: `Publish to JSR` publishes workspace packages in topological order.
actual: `@napplet/core@0.3.0` published, then `@napplet/nub@0.3.0` failed.
error: JSR registry documentation generation failed resolving `./json-schema` from `file:///src/config/types.ts`.
timeline: Observed in GitHub Actions run `26228838262`, job `77207200989`, on 2026-05-21.
reproduction: `publish-jsr` workflow step `pnpm -r --filter='./packages/*' exec npx jsr publish --allow-slow-types --allow-dirty`.

## Eliminated

- hypothesis: JSR auth/OIDC is still the active blocker.
  evidence: The job successfully published `@napplet/core@0.3.0`.
  timestamp: 2026-05-22
- hypothesis: Package order is still the active blocker.
  evidence: `@napplet/core` was available before `@napplet/nub` attempted to publish.
  timestamp: 2026-05-22
- hypothesis: Re-running the workflow will fail immediately because `@napplet/core@0.3.0` is already published.
  evidence: JSR publishing docs state `jsr publish` will not attempt to publish a version that is already published.
  timestamp: 2026-05-22

## Evidence

- timestamp: 2026-05-22
  checked: GitHub Actions run `26228838262`, job `77207200989`
  found: `@napplet/core@0.3.0` successfully published, then `@napplet/nub@0.3.0` failed during documentation generation resolving `./json-schema` from `file:///src/config/types.ts`.
  implication: The active failure is a published-source resolution problem in `@napplet/nub`, not auth or topological ordering.

- timestamp: 2026-05-22
  checked: `packages/nub/src/config/types.ts` and `packages/nub/jsr.json`
  found: The source imported `JSONSchema7` from `json-schema`, but JSR publish metadata did not provide a resolvable registry import for that npm-only type package.
  implication: Registry-side docs generation cannot rely on local `node_modules` even when local dry-run has access to it.

- timestamp: 2026-05-22
  checked: `deno check packages/nub/src/config/types.ts`
  found: Exited 0 after replacing `JSONSchema7` with a self-contained `NappletConfigSchema` interface.
  implication: The file that failed registry docs generation is independently resolvable without `json-schema`.

- timestamp: 2026-05-22
  checked: `deno doc packages/nub/src/config/types.ts`
  found: Exited 0 and rendered the config schema public types.
  implication: The docs-generation path no longer hits the missing `./json-schema` edge.

- timestamp: 2026-05-22
  checked: `cd packages/nub && npx jsr publish --dry-run --allow-slow-types --allow-dirty`
  found: Dry run complete.
  implication: The package that failed in GitHub Actions passes local JSR verification after the fix.

- timestamp: 2026-05-22
  checked: `cd packages/vite-plugin && deno check --config jsr.json src/index.ts`
  found: The previous `npm:vite@>=5.0.0` import mapping was invalid; after changing it to `npm:vite@^6.3.0`, Deno advanced to the expected `@napplet/nub` registry-missing error.
  implication: The Vite plugin had a latent JSR package-configuration blocker that would have appeared after `@napplet/nub` published.

- timestamp: 2026-05-22
  checked: `pnpm -r type-check`, `pnpm -r build`, and `pnpm -r test:unit`
  found: All exited 0.
  implication: The schema type change and JSR import mapping change preserve workspace behavior.

- timestamp: 2026-05-22
  checked: `pnpm -r --filter='./packages/*' exec npx jsr publish --dry-run --allow-slow-types --allow-dirty`
  found: `@napplet/core` and `@napplet/nub` dry-runs completed, then the command stopped at `@napplet/vite-plugin` because `@napplet/nub` is not yet present on the live JSR registry.
  implication: This is an expected local limitation before the real workflow publishes `@napplet/nub`; it is not the original `json-schema` docs failure.

## Resolution

root_cause: `@napplet/nub` published TypeScript source imported `JSONSchema7` from the npm-only `json-schema` type package. Local dry-run could see `node_modules`, but registry-side documentation generation analyzed the uploaded source without that local type package and failed resolving it. A second latent blocker existed in `@napplet/vite-plugin/jsr.json`: `npm:vite@>=5.0.0` is not a valid Deno/JSR npm specifier.
fix: Made `NappletConfigSchema` self-contained in `packages/nub/src/config/types.ts`; changed the Vite plugin to consume that exported type; removed direct `@types/json-schema` dependencies/imports from publishable packages; changed the Vite plugin JSR import mapping to `npm:vite@^6.3.0`; updated Vite plugin docs.
verification: `pnpm -r type-check`; `pnpm -r build`; `pnpm -r test:unit`; `deno check packages/nub/src/config/types.ts`; `deno doc packages/nub/src/config/types.ts`; `cd packages/nub && npx jsr publish --dry-run --allow-slow-types --allow-dirty`; `cd packages/vite-plugin && deno check --config jsr.json src/index.ts` now advances past the Vite specifier to the expected registry-missing `@napplet/nub`; grep confirms no remaining `json-schema` import in published package sources.
files_changed:
- packages/nub/src/config/types.ts
- packages/nub/package.json
- packages/vite-plugin/src/index.ts
- packages/vite-plugin/package.json
- packages/vite-plugin/tsconfig.json
- packages/vite-plugin/jsr.json
- packages/vite-plugin/README.md
- pnpm-lock.yaml
- .planning/debug/resolved/jsr-nub-docs-resolution.md
