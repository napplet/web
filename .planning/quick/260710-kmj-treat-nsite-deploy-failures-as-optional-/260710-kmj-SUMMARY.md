---
quick_id: 260710-kmj
status: complete
code_commit: 2248c6c8
completed: 2026-07-10
---

# Quick Task 260710-kmj Summary

## Goal

Treat nsite mirror publish failures as optional skips in the `Deploy site` workflow.

## Changes

- Added `id: deploy-nsite` and step-level `continue-on-error: true` to the
  `Deploy to nsite` action step in `.github/workflows/deploy-site.yml`.
- Added a follow-up warning step that runs when the raw nsite step outcome is
  `failure`, making the skipped optional mirror visible without failing the job.
- Kept build, docs/conformance assembly, Bunny storage config, and Bunny CDN deploy
  as hard-failing workflow steps.

## Verification

- Live failure inspected: run `29087545720`, workflow `Deploy site`, job
  `build-and-deploy`, failed only at `Deploy to nsite` after Bunny CDN deploy
  succeeded; nsyte reported `Bunker connection timeout after 30s`.
- `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/deploy-site.yml")'`
- `go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/deploy-site.yml`
- `pnpm lint`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `git diff --check`
- `npx --yes aislop scan --changes .` -> 100 / 100
- `npx --yes aislop scan .` -> 88 / 100 from pre-existing full-repo complexity
  warnings outside this workflow change.

## Remaining Risk

This does not repair the external NIP-46 signer availability issue. It only keeps that
optional nsite mirror outage from blocking the canonical Bunny-backed site deploy.
