---
status: resolved
trigger: "$gsd-debug jsr publish is still failing https://github.com/napplet/napplet/actions/runs/26228838262"
created: 2026-05-21
updated: 2026-05-22
---

# JSR Nub Docs Resolution

## Current Focus

hypothesis: CONFIRMED - `@napplet/nub` published source had a docs-generation-only type edge to `json-schema`; `@napplet/vite-plugin` had a later invalid JSR npm import range for `vite`; `@napplet/sdk` and `@napplet/shim` had JSR-forbidden global `Window` type augmentations.
test: Remove the `json-schema` published-source edge, keep the Vite plugin on the exported napplet schema type, use a valid JSR npm import mapping, and stop JSR-published sources from declaring global TypeScript mutations.
expecting: `@napplet/nub`, `@napplet/sdk`, and `@napplet/shim` dry-run checks pass, full workspace JSR dry-run completes, and a real GitHub Actions rerun can skip already-published versions and publish the remaining packages.
next_action: Push the global-type follow-up and rerun `Publish to JSR`.

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

- timestamp: 2026-05-22
  checked: GitHub Actions run `26281401112`, job `77358205519`
  found: The first fix worked for the original failure: `@napplet/core@0.3.0` was skipped as already published, `@napplet/nub@0.3.0` published successfully, and `@napplet/vite-plugin@0.3.0` also published before the job failed on `@napplet/shim@0.3.0` with `modifying global types is not allowed file:///src/index.ts:64:1`.
  implication: The workflow had advanced to the next JSR package rule; `@napplet/sdk` had the same global `Window` augmentation pattern and was still unpublished.

- timestamp: 2026-05-22
  checked: `cd packages/shim && npx jsr publish --dry-run --allow-slow-types --allow-dirty` and `cd packages/sdk && npx jsr publish --dry-run --allow-slow-types --allow-dirty`
  found: Both focused dry-runs completed after removing global `Window` augmentation from published source.
  implication: The package-rule failure for the remaining unpublished packages is resolved locally.

- timestamp: 2026-05-22
  checked: `pnpm -r --filter='./packages/*' exec npx jsr publish --dry-run --allow-slow-types --allow-dirty`
  found: Full workspace JSR dry-run completed for `@napplet/core`, `@napplet/nub`, `@napplet/vite-plugin`, `@napplet/sdk`, and `@napplet/shim`.
  implication: Local JSR verification no longer finds a package-analysis blocker across the workspace graph.

## Resolution

root_cause: `@napplet/nub` published TypeScript source imported `JSONSchema7` from the npm-only `json-schema` type package. Local dry-run could see `node_modules`, but registry-side documentation generation analyzed the uploaded source without that local type package and failed resolving it. A second latent blocker existed in `@napplet/vite-plugin/jsr.json`: `npm:vite@>=5.0.0` is not a valid Deno/JSR npm specifier. After those were fixed, the rerun reached a third JSR package rule: `@napplet/shim` modified global `Window` types in published source; `@napplet/sdk` had the same pattern and was still unpublished.
fix: Made `NappletConfigSchema` self-contained in `packages/nub/src/config/types.ts`; changed the Vite plugin to consume that exported type; removed direct `@types/json-schema` dependencies/imports from publishable packages; changed the Vite plugin JSR import mapping to `npm:vite@^6.3.0`; removed global `Window` augmentation from JSR-published `@napplet/sdk` and `@napplet/shim` source; documented the local `NappletGlobal` cast pattern.
verification: `pnpm -r type-check`; `pnpm -r build`; `pnpm -r test:unit`; `pnpm -r lint`; `deno check packages/nub/src/config/types.ts`; `deno doc packages/nub/src/config/types.ts`; `cd packages/nub && npx jsr publish --dry-run --allow-slow-types --allow-dirty`; `cd packages/shim && npx jsr publish --dry-run --allow-slow-types --allow-dirty`; `cd packages/sdk && npx jsr publish --dry-run --allow-slow-types --allow-dirty`; full workspace `pnpm -r --filter='./packages/*' exec npx jsr publish --dry-run --allow-slow-types --allow-dirty`; grep confirms no remaining `json-schema` import or global type augmentation in published package sources.
files_changed:
- packages/core/src/types.ts
- packages/nub/src/config/types.ts
- packages/nub/package.json
- packages/sdk/src/index.ts
- packages/shim/src/index.ts
- packages/shim/README.md
- packages/vite-plugin/src/index.ts
- packages/vite-plugin/package.json
- packages/vite-plugin/tsconfig.json
- packages/vite-plugin/jsr.json
- packages/vite-plugin/README.md
- pnpm-lock.yaml
- .planning/debug/resolved/jsr-nub-docs-resolution.md
