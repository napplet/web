# Quick Task 260710-hk2 Summary

## Result

Fixed PR #155 `CI / ci` by installing Playwright Chromium in the CI workflow
before root `pnpm test` runs.

## Root Cause

PR #155 added `pnpm test:tutorial` to root `pnpm test`. The tutorial harness
runs `napplet-conformance`, which launches Playwright Chromium. The CI workflow
already installed dependencies, type-checked, and built successfully, but it did
not install Playwright browsers before `pnpm test`.

GitHub failure:

- Workflow run `29086732122`, job `86342103545`
- Failing step: `Run pnpm test`
- Error: Playwright executable missing at
  `~/.cache/ms-playwright/chromium_headless_shell-1228/...`

## Files

- `.github/workflows/ci.yml`
- `.planning/quick/260710-hk2-fix-pr-155-ci-failure-caused-by-root-pnp/260710-hk2-PLAN.md`
- `.planning/quick/260710-hk2-fix-pr-155-ci-failure-caused-by-root-pnp/260710-hk2-SUMMARY.md`
- `.planning/STATE.md`

## Validation

- GitHub failed-check log inspected with `gh run view 29086732122 --job 86342103545 --log`.
- `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/ci.yml")'`
- `pnpm test:tutorial`
- `pnpm test`
- `git diff --check`

## Notes

- Kept root `pnpm test` running tutorial conformance.
- Mirrored the existing Playwright cache/install pattern from the conformance
  workflow so the aggregate CI job has the browser dependency it now needs.
