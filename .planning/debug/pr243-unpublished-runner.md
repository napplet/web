---
status: fixing
trigger: "PR #243 tests are red across the board"
created: 2026-10-13
updated: 2026-10-14
---

# PR #243 runner publication dependency

## Symptoms

- Expected: the standalone CLI provisions its pinned tools from npm with an empty PATH and a fresh cache on all five platforms.
- Actual: every job in run 38299057704 fails during the first screenshot command.
- Error: `No matching version found for @napplet/conformance-cli@0.3.4.`
- Reproduction: install that exact package version from npm; it is absent. Latest published version is 0.3.3.

## Current Focus

- Cause: the documented release dependency. All five jobs in the current run 38520521467 still fail with npm ETARGET for conformance CLI 0.3.4.
- Current state: PR #242's peer compatibility review is resolved and its original nine checks passed. Main's subsequently merged icon skill introduced two text conflicts, now resolved on the prerequisite branch while retaining both icon and GAMEPAD guidance. Combined-branch verification is running before publication.
- Next action: complete the prerequisite release, verify the actual npm artifacts, integrate main into this follow-up, retarget #243 to main, and verify fresh-cache execution on all five platforms.

## Evidence

- [Failed standalone run](https://github.com/napplet/web/actions/runs/38299057704): Linux x64/ARM64, macOS x64/ARM64, and Windows all fail on the same missing package.
- [PR #242](https://github.com/napplet/web/pull/242), head `44d663a14af0f91a3797614c76e5c3d684cec52e`: CI, conformance, links, slop, and all five standalone jobs passed. Release versions are already applied and no unconsumed changeset remains.
- npm registry checked directly: conformance CLI 0.3.4 absent; Kehto CLI 0.5.5 and Paja 0.21.0 present.
- The pinned package installation is the behavior under test. Skipping the check, substituting a local package, or downgrading to the old runner would conceal or remove the intended release behavior.

## Resolution

Root cause confirmed. Updated the stacked branch with #242's latest reviewed fixes and restored the CLI changelog's existing unwrapped history, leaving one focused 0.9.1 entry. Local verification passed: build (12 tasks), type-check (18 tasks), recursive unit tests, and diff whitespace checks. AI-slop passed at 98/100 with zero errors; the existing `fflate` dependency advisory is the sole warning.

The user resumed the goal to fix #243. The required release sequence is in progress; fresh-cache success remains unproven until the actual package is published and the platform tests pass. No dependency downgrade, local-package substitution, or test bypass was added.
