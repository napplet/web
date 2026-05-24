---
quick_id: 260524-l1t
description: please add a workflow that runs the ai slop scan and produces a badge for the readme that shows the score
date: 2026-05-24
commit: 2835356
status: Complete
---

# Quick Task 260524-l1t — Summary

## What changed

`README.md` now includes an AI Slop Score badge backed by `.github/badges/aislop-score.json`.

`.github/workflows/ai-slop.yml` now:

1. Runs `pnpm dlx aislop@0.9.3 scan --json .` on pushes to `main`, pull requests to `main`, and manual dispatches.
2. Generates a Shields endpoint JSON payload from the scan score.
3. Uploads the generated badge source as a workflow artifact.
4. Updates `.github/badges/aislop-score.json` on `main` only when the score changes.
5. Keeps PR scan jobs read-only; only the push-to-main badge update job receives `contents: write`.

## Why

The workflow status badge only shows pass/fail. The new Shields endpoint badge exposes the current numeric AI slop score directly in the README while keeping the source file stable at a public raw GitHub URL.

## Verification

| Gate | Command | Result |
|---|---|---|
| Workflow lint | `go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/ai-slop.yml` | exit 0 |
| Badge JSON schema | Node validation over `.github/badges/aislop-score.json` | exit 0 |
| Badge/report match | Node comparison of `.github/badges/aislop-score.json` with `/tmp/napplet-l1t-aislop.json` | exit 0 |
| Static gate | `pnpm dlx aislop@0.9.3 scan --json .` | exit 0; 89/100 Healthy, 0 errors, 4 known warnings, 0 fixable |
| Type-check | `pnpm -r type-check` | exit 0 |
| Unit tests | `pnpm -r test:unit` | exit 0 |
| Build | `pnpm -r build` | exit 0 |
| Lint | `pnpm -r lint` | exit 0; no selected package has a lint script |
| Whitespace | `git diff --check` | exit 0 |

## Commits

- `2835356` — Add AI slop score badge automation
