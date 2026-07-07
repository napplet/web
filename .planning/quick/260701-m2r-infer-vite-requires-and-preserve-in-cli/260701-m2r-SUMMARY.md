# Quick Task 260701-m2r Summary

## Result

`@napplet/vite-plugin` now supports opt-in NAP requirement inference and `@napplet/cli` preserves plugin-emitted `requires` tags during deploy template generation.

## Changed Files

- `.changeset/napplet-vite-requires-inference.md`
- `.changeset/napplet-cli-preserve-requires.md`
- `packages/vite-plugin/src/requirements.ts`
- `packages/vite-plugin/src/types.ts`
- `packages/vite-plugin/src/index.ts`
- `packages/vite-plugin/src/manifest.ts`
- `packages/vite-plugin/src/index.test.ts`
- `packages/vite-plugin/README.md`
- `packages/cli/src/manifest.ts`
- `packages/cli/tests/manifest_test.ts`
- `packages/cli/README.md`

## Acceptance Coverage

- Static `@napplet/nap/relay` imports emit `["requires", "relay"]`.
- `@napplet/nap/storage` plus `window.napplet.identity` emits `storage` and `identity`.
- Type-only imports and dynamic `window.napplet[domain]` access do not infer requirements.
- Legacy explicit `requires: ["relay"]` still works without inference.
- Explicit and inferred requirements are deduped.
- Warn mode warns and builds when inferred domains are missing from explicit config.
- Error mode fails the build when inferred domains are missing from explicit config.
- CLI deploy templates preserve plugin-emitted `requires` tags on root, named, and companion snapshot manifests.

## Verification

- `deno fmt packages/cli`
- `deno fmt --check packages/cli`
- `deno lint packages/cli`
- `pnpm --filter @napplet/vite-plugin build`
- `pnpm --filter @napplet/vite-plugin type-check`
- `pnpm --filter @napplet/vite-plugin test:unit`
- `pnpm --filter @napplet/cli build`
- `pnpm --filter @napplet/cli test:unit`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm dlx aislop@0.12.0 scan --json .` returned 0 errors and the repo's existing 7 warnings.
- `git diff --check`

## Notes

- No new dependencies were added.
- Dynamic whole-program analysis remains out of scope.
