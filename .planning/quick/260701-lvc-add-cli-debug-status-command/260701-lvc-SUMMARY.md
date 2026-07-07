# Quick Task 260701-lvc Summary

## Result

`@napplet/cli` now has `napplet debug`, a read-only JSON command for inspecting `.napplet` config, discovery results, deploy-plan items, manifest template readiness, and signing readiness. The deploy command now also emits the same sanitized signing diagnostic instead of the raw signing method, preventing direct CI signing material from being echoed in JSON output.

## Changed Files

- `.changeset/napplet-cli-debug-status.md`
- `packages/cli/README.md`
- `packages/cli/src/cli.ts`
- `packages/cli/src/debug.ts`
- `packages/cli/tests/debug_test.ts`

## Verification

- `deno fmt packages/cli`
- `deno fmt --check packages/cli`
- `deno lint packages/cli`
- `pnpm --filter @napplet/cli build`
- `pnpm --filter @napplet/cli test:unit`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm dlx aislop@0.12.0 scan --json .` returned 0 errors and the repo's existing 7 warnings.
- `git diff --check`

## Notes

- The command is local/read-only: no Blossom uploads, relay publishes, key-store writes, or network probes.
- Live relay/server status checks remain future work.
