# Exclude local deploy state summary

## Result

`napplet deploy` no longer treats local project/control state as deployable
napplet content when `sourceDir` points at the repo root.

The manifest collector now skips hidden path segments such as `.napplet`,
`.git`, `.env`, `.vscode`, and `.DS_Store`, while preserving intentional
`.well-known` content. It also skips `node_modules` dependency trees and keeps
`.nip5a-manifest.json` as metadata input only.

## Verification

- `deno fmt --check packages/cli/src/manifest.ts
  packages/cli/tests/manifest_test.ts
  .planning/quick/260710-rce-exclude-local-cli-config-and-tooling-sta/PLAN.md`
- `deno task --cwd packages/cli check`
- `deno lint packages/cli/src packages/cli/tests`
- `deno task --cwd packages/cli test:unit` - 91 passed
- Real installed-wrapper fixture: `napplet init` then
  `napplet deploy
  --dry-run` included `/index.html` and excluded
  `.napplet/config.json` plus `.env`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm lint` - no configured lint tasks
- `pnpm check:jsr`
- `pnpm test:tutorial` - conformant, 5 pass / 0 fail / 5 skip
- `pnpm test`
- `git diff --check`
- `pnpm dlx aislop@0.13.1 scan --changes --json .` - 100 / 100

## Commit

- `5f28c4e5` - `fix(cli): keep local state out of deploy manifests`
