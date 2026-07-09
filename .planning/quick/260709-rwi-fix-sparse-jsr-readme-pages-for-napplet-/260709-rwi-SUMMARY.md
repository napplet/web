---
status: complete
quick_id: 260709-rwi
date: 2026-07-09
---

# Quick Task 260709-rwi Summary

## Goal

Fix sparse JSR package overview/README surfaces for `@napplet/cli` and audit the
other live `@napplet/*` JSR packages for the same problem.

## Changes

- Expanded the root JSR package docs in `packages/cli/src/mod.ts` and switched
  the entry from `@module` to `@packageDocumentation`, so the `@napplet/cli`
  overview no longer shows only two short paragraphs.
- Expanded the root package docs in `packages/shim/src/index.ts` and
  `packages/vite-plugin/src/index.ts`, which had the same `@module` overview
  behavior on JSR.
- Expanded `packages/conformance/README.md` with install guidance, direct
  validation examples, exported surfaces, and the CLI pairing.
- Added `.changeset/fresh-readmes-jump.md` so the changed shipped docs release
  for `@napplet/cli`, `@napplet/conformance`, `@napplet/shim`, and
  `@napplet/vite-plugin`.

## JSR Audit

- Live JSR scope contained `@napplet/cli`, `@napplet/conformance`,
  `@napplet/core`, `@napplet/nap`, `@napplet/nub`, `@napplet/sdk`,
  `@napplet/shim`, `@napplet/skills`, and `@napplet/vite-plugin`.
- Repo-owned sparse surfaces found and fixed: `cli`, `shim`, `vite-plugin`,
  and the short `conformance` README.
- `core`, `nap`, `sdk`, and `skills` already rendered substantive JSR overview
  content.
- `@napplet/nub` is still live on JSR but has no `packages/nub` source or
  tracked files in this checkout, so there was no repo-owned README to update.

## Verification

- `deno fmt packages/cli/src/mod.ts`
- JSR dry-runs without `--allow-slow-types`:
  - `packages/cli`: `npx --yes jsr publish --dry-run --allow-dirty`
  - `packages/conformance`: `npx --yes jsr publish --dry-run --allow-dirty`
  - `packages/shim`: `npx --yes jsr publish --dry-run --allow-dirty`
  - `packages/vite-plugin`: `npx --yes jsr publish --dry-run --allow-dirty`
- `pnpm check:jsr`
- `pnpm type-check`
- `pnpm build`
- `pnpm -r test:unit`
- `pnpm lint` (Turbo reported no configured lint tasks)
- `git diff --check`
- `pnpm dlx aislop@0.12.0 scan --json .` -> 82 / Healthy, matching the repo's
  existing baseline findings
- `pnpm dlx aislop@0.12.0 scan --changes --json .` -> 98 / Healthy; only the
  existing `js-yaml` advisory in root `package.json` was reported

## Remaining Scope

- Live JSR pages update only after this branch is merged and the changeset
  release publishes the affected package versions.
- The `@napplet/vite-plugin` dry-run still reports the known
  `unanalyzable-dynamic-import` warning from `src/config-schema.ts`; the publish
  simulation succeeds.
- `@napplet/nub` is out of source scope in this repo.
