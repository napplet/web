---
status: in-progress
date: 2026-07-02
---

# Gate registry publish workflows to Version Packages state

## Scope

- Prevent the independent JSR publish workflow from running on ordinary `main` pushes that still have pending changesets and stale JSR dependency pins.
- Preserve the npm Changesets workflow's ordinary `main` push behavior because it creates/updates the Version Packages PR.
- Clarify the npm workflow trigger model so future edits do not gate away release PR creation.

## Verification

- Inspect live Actions failure and current Version Packages PR/main state.
- Validate workflow YAML shape by review and `git diff --check`.
- Push PR and verify CI/workflow checks.
