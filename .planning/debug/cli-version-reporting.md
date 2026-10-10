---
status: fixing
trigger: "Add --version, -v, or version to identify the running CLI; newest JSR install reportedly publishes old event schema."
created: 2026-10-09
updated: 2026-10-09
---

# CLI version visibility

## Evidence

- The CLI dispatcher has no version flag or command.
- JSR metadata currently lists 0.8.0 as latest; its published manifest-format selector defaults to current, including non-interactive deployments.
- Local main contains version 0.8.1. That difference alone does not explain legacy event output: current event support predates both releases.
- The user's exact install/deploy commands and resolved executable path are pending; no schema defect has been reproduced.

## Current Focus

Add all three version aliases using package metadata embedded by imports, cover dispatch and standalone output, and document version/path checks. Investigate published JSR behavior without broadcasting events. Ship separately from installer PR #231.
