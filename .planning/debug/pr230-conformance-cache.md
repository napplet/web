---
status: investigating
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

- Hypothesis: removing the workspace dependency disconnects NAP sources from the transitive build/test task hash.
- Next action: integrate current main, reproduce the unchanged test hash after a NAP-only edit, restore the development dependency, and verify cache invalidation plus the required project checks.

## Evidence

- PR head `d5b09b78990d9d452b9c12a7347806623eb631ea` omits `@napplet/nap` from both dependencies and devDependencies.
- `packages/conformance/src/validators/envelope.drift.test.ts` recursively reads `packages/nap/src` through the filesystem.
- Root Turbo `test:unit` depends on the package's `build`; `build` depends on dependency builds. No explicit external source inputs compensate for the removed dependency.
- GitHub reports conflicts with current main. The original working directory contains unrelated CLI work; this task uses a separate worktree based on the PR head.

## Resolution

Pending reproduction and verification.
