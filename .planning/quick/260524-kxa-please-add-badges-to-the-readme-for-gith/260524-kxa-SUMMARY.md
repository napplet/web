---
quick_id: 260524-kxa
description: please add badges to the README for github workflows, as well as badges for both npm and jsr
date: 2026-05-24
commit: 8f4662b
status: Complete
---

# Quick Task 260524-kxa — Summary

## What changed

`README.md` now includes:

1. GitHub Actions status badges for:
   - CI
   - Publish
   - Publish to JSR
2. Package-level npm version badges for:
   - `@napplet/core`
   - `@napplet/shim`
   - `@napplet/sdk`
   - `@napplet/nub`
   - `@napplet/vite-plugin`
3. Package-level JSR badges for the same five packages.

## Why

The README previously showed the package list as plain package names and had no at-a-glance workflow status. The badges expose current CI/publish state and registry presence directly from the first screen.

## Verification

| Gate | Command | Result |
|---|---|---|
| Badge endpoint probe | Node HTTPS probe over 13 badge URLs | all HTTP 200 |
| Type-check | `pnpm -r type-check` | exit 0 |
| Unit tests | `pnpm -r test:unit` | exit 0 |
| Static gate | `pnpm dlx aislop scan --json .` | exit 0; 0 errors, 4 known file-size warnings |
| Whitespace | `git diff --check` | exit 0 |

## Commits

- `8f4662b` — Add release badges to the project README
