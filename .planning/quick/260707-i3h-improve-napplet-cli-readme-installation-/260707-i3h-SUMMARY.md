---
phase: quick-260707-i3h
status: complete
autonomous: false
---

# Quick Task 260707-i3h — Improve `@napplet/cli` README installation and usage docs

**Status:** complete
**Date:** 2026-07-07
**Branch:** docs/cli-readme-user-docs

## What changed

- Rewrote `packages/cli/README.md` around user-facing installation, quick start,
  command reference, signing/key management, project layouts, conformance/Paja
  wrappers, troubleshooting, and development commands.
- Removed internal "first package slice" framing and verified the README no
  longer contains `slice`, `sdlc`, `sldc`, `first package`, `milestone`, or
  `phase` wording.
- Added `./cli` to `packages/cli/deno.json` exports so the documented
  `deno install ... jsr:@napplet/cli/cli` command maps to a real JSR entrypoint.
- Added root `benchmark.json` and `benchmark.md` to `.gitignore`; both local
  benchmark files no longer appear in `git status`.
- Added a patch changeset for the CLI package export/docs change.

## Verification

- `deno fmt --check packages/cli/deno.json` — passed.
- `deno task check` from `packages/cli` — passed.
- `deno task test:unit` from `packages/cli` — 52 passed, 0 failed.
- `deno task dev --help` from `packages/cli` — printed the CLI help.
- `npx jsr publish --dry-run --allow-slow-types --allow-dirty` from
  `packages/cli` — passed; dry-run included `src/cli.ts`.
- `git diff --check` — passed.
- `pnpm dlx aislop@0.12.0 scan --json .` — passed with score 82, 0 errors;
  remaining warnings are pre-existing large-file/duplicate-type/js-yaml findings
  outside this change.
- `pnpm build` — passed, 13/13 tasks successful.
- `pnpm type-check` — passed, 17/17 tasks successful.
- `pnpm -r test:unit` — passed across recursive workspace unit tests.

## Remaining risks

- The JSR install command is validated by local export-map dry-run, not by a live
  install from a published version because this branch is not yet published.
