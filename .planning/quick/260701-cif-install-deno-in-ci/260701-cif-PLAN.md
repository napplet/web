# Quick Task 260701-cif: Install Deno in CI

**Date:** 2026-07-01
**Status:** complete

## Problem

PR #103 has two failing GitHub Actions checks on head `b4bd3be6`:

- CI run `28527582726` fails during `pnpm type-check`.
- Conformance run `28527582858` fails during `pnpm build`.

Both logs stop in `@napplet/cli` with `sh: 1: deno: not found`. The CLI package
is now part of the root build/type-check graph and its npm scripts delegate to
`deno task`, but the workflows install only Node and pnpm.

## Scope

Install Deno in the failing GitHub Actions workflows before root `pnpm` commands
execute.

## Tasks

1. Add the official `denoland/setup-deno@v2` action to `.github/workflows/ci.yml`.
2. Add the official `denoland/setup-deno@v2` action to `.github/workflows/conformance.yml`.
3. Verify workflow syntax and local gates.
4. Push the branch and confirm PR checks rerun.

## Verification Plan

- `deno --version`
- `pnpm type-check`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @napplet/conformance-e2e test:e2e`
- `git diff --check`
- Live PR check readback after push.

## Outcome

Added `denoland/setup-deno@v2` to the two workflows that execute root commands
now containing Deno-backed `@napplet/cli` tasks.

## Verification

- `ruby -e 'require "yaml"; ARGV.each { |f| YAML.load_file(f); puts "ok #{f}" }' .github/workflows/ci.yml .github/workflows/conformance.yml`
- `deno --version`
- `pnpm type-check`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @napplet/conformance-e2e test:e2e`
- `git diff --check`

## Remaining Risk

`actionlint` is not installed locally, so workflow validation used Ruby YAML
parsing plus live GitHub Actions rerun/readback after push.
