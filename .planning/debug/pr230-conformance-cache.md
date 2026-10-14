---
status: verifying
trigger: "resolve comment https://github.com/napplet/web/pull/230#issuecomment-6130823268"
created: 2026-10-14
updated: 2026-10-14
---

# Conformance cache invalidation for NAP source changes

## Symptoms

- Expected: a NAP-only source edit invalidates the conformance unit-test cache because the envelope drift guard reads those source files directly.
- Reported: PR #230 removes `@napplet/nap` entirely from conformance's package dependencies, allowing Turbo to reuse a passing result after NAP sources change.
- Source: [review comment](https://github.com/napplet/web/pull/230#issuecomment-6130823268).

## Current Focus

- Cause: removing the workspace dependency disconnects NAP sources from the transitive build/test task hash.
- Next action: complete the project checks and push the corrected PR for fresh CI.

## Evidence

- PR head `d5b09b78990d9d452b9c12a7347806623eb631ea` omits `@napplet/nap` from both dependencies and devDependencies.
- `packages/conformance/src/validators/envelope.drift.test.ts` recursively reads `packages/nap/src` through the filesystem.
- Root Turbo `test:unit` depends on the package's `build`; `build` depends on dependency builds. No explicit external source inputs compensate for the removed dependency.
- GitHub reports conflicts with current main. The original working directory contains unrelated CLI work; this task uses a separate worktree based on the PR head.
- Integrated main `83900056`, resolving the JSR metadata conflict by retaining conformance 0.20.0 and core ^0.34.0 while omitting the unused NAP runtime import.
- A regression test copies the real workspace manifests, lockfile, Turbo configuration, and core/NAP/conformance source trees into an isolated temporary checkout. Before the fix, a NAP-only source edit leaves the conformance test hash unchanged (`c240d94b0814364e`), failing the assertion.
- Restoring `@napplet/nap` as a devDependency makes the regression pass: editing only NAP source changes the conformance test hash, and restoring the source restores the original hash. All six workflow-contract tests pass. The test runs in the existing CI workflow-contract gate.

## Resolution

Moved the NAP dependency to development scope, synchronized the pnpm lockfile, and corrected the changeset, README, and original audit records. The runtime dependency remains removed. Full verification is in progress.
