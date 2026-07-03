---
status: complete
date: 2026-07-03
quick_id: 260703-gz0
commit: 6d98908c
---

# Quick Task 260703-gz0 Summary

Added @napplet/cli to the JSR-only publish path for PR #103.

## Changes

- Publish to JSR now installs Deno before running JSR publish.
- The JSR publish comments explicitly document that @napplet/cli publishes from deno.json.
- The npm publish script excludes @napplet/cli.
- sync-jsr-versions also syncs deno.json versions for Deno-first JSR packages.

## Verification

- `node -e` JSON parse for `package.json` and `packages/cli/deno.json`
- Ruby YAML parse for `.github/workflows/publish-jsr.yml`
- `deno --version`
- `pnpm -r --filter='!@napplet/cli' publish --help`
- `pnpm -r --filter='./packages/*' --filter='!@napplet/boilerplate' --filter='!@napplet/conformance-cli' list --depth -1`
- `pnpm -r --filter='!@napplet/cli' list --depth -1`
- `node scripts/sync-jsr-versions.mjs`
- `npx jsr publish --dry-run --allow-slow-types --allow-dirty` in `packages/cli`
- `node --check scripts/sync-jsr-versions.mjs`
- `git diff --check`

## Remaining Risks

- Live GitHub Actions publish was not triggered.
- `scripts/ci_monitor.cjs` was not present on this branch, so workflow validation used direct local commands instead of the GitHub workflow skill wrapper.
