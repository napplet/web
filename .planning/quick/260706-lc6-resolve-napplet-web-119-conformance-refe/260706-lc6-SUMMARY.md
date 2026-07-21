---
status: complete
completed: 2026-07-06
quick_id: 260706-lc6
slug: resolve-napplet-web-119-conformance-refe
commit: 5ca864bc
---

# Quick Task 260706-lc6 Summary

## Result

Resolved napplet/web#119 by making the conformance runtime inject a minimal
direct `window.napplet.resource` API when the `resource` domain is declared.
`resource.bytes()`, `resource.bytesMany()`, `resource.info()`, and
`resource.bytesAsObjectURL()` now route through the existing reference-shell
envelope responder.

The reference shell now decodes `data:` URLs itself for `resource.bytes` and
`resource.bytesMany`, so the fixture gets deterministic bytes without ambient
fetch.

## Files Changed

- `packages/conformance/src/run/boot.ts`
- `packages/conformance/src/run/boot.test.ts`
- `packages/conformance/src/shell/reference-shell.ts`
- `packages/conformance/src/shell/reference-shell.test.ts`
- `tests/e2e/harness/conformance.e2e.test.ts`
- `tests/fixtures/napplets/resource-data/`
- `.changeset/calm-resources-sip.md`
- `pnpm-lock.yaml`

## Validation

- `pnpm --filter @napplet/conformance exec vitest run src/run/boot.test.ts src/shell/reference-shell.test.ts`
- `pnpm --filter @napplet/conformance type-check`
- `pnpm --filter @napplet/conformance build`
- `pnpm --filter @napplet/conformance-cli build`
- `pnpm --filter @napplet/conformance-cli type-check`
- `node packages/conformance-cli/dist/cli.js tests/fixtures/napplets/resource-data --reporter json`
- `pnpm --filter @napplet/conformance-e2e test:e2e`
- `pnpm --filter @napplet/conformance test:unit`
- `pnpm --filter @napplet/conformance-cli test:unit`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm build`
- `pnpm lint`
- `git diff --check`

## Notes

- `benchmark.json` and `benchmark.md` were pre-existing untracked files and were
  left untouched.
- NAP-RESOURCE is not present on `napplet/naps` master at this point, so this
  task added no new protocol surface. It only wired conformance to already
  shipped local `resource.*` envelope/package definitions.
