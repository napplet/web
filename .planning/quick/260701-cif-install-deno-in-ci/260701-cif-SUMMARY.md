# Quick Task 260701-cif Summary

## Result

Fixed the PR #103 CI failure where both `CI / ci` and `Conformance / conformance`
failed because GitHub runners did not have `deno` installed.

## Root Cause

`@napplet/cli` participates in root `pnpm build`, `pnpm type-check`, and test
commands. Its package scripts delegate to `deno task`, but the workflows only set
up Node and pnpm.

## Changed Files

- `.github/workflows/ci.yml`
- `.github/workflows/conformance.yml`

## Verification

- `gh run view 28527582726 --log-failed` showed `@napplet/cli#type-check` failed with `sh: 1: deno: not found`.
- `gh run view 28527582858 --log-failed` showed `@napplet/cli#build` failed with `sh: 1: deno: not found`.
- `ruby -e 'require "yaml"; ARGV.each { |f| YAML.load_file(f); puts "ok #{f}" }' .github/workflows/ci.yml .github/workflows/conformance.yml`
- `deno --version`
- `pnpm type-check`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @napplet/conformance-e2e test:e2e`
- `git diff --check`

## Notes

No package code or protocol behavior changed.
