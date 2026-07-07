---
phase: quick-260707-jrh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .github/workflows/publish.yml
  - .planning/STATE.md
autonomous: false
requirements: [QUICK-260707-jrh]
user_setup: []
---

# Quick Task 260707-jrh: Fix Publish workflow Deno setup and drive pending changeset release

## Objective

Repair the release workflow that failed before Changesets could create a Version
Packages PR, then drive the pending changeset release through GitHub Actions to
live registry proof.

## Plan

1. Add Deno setup to `.github/workflows/publish.yml` before `pnpm install` and
   `pnpm build`, matching CI and JSR workflows.
2. Validate the workflow syntax and local build/test gates.
3. Push a fix PR, merge it if checks pass, then verify the `Publish` workflow
   creates or updates the Version Packages PR.
4. Merge the Version Packages PR if checks pass, then verify npm/JSR publish
   state for the released packages.
