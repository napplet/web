---
status: awaiting-release-approval
trigger: "PR #243 tests are red across the board"
created: 2026-10-13
updated: 2026-10-13
---

# PR #243 runner publication dependency

## Symptoms

- Expected: the standalone CLI provisions its pinned tools from npm with an empty PATH and a fresh cache on all five platforms.
- Actual: every job in run 38299057704 fails during the first screenshot command.
- Error: `No matching version found for @napplet/conformance-cli@0.3.4.`
- Reproduction: install that exact package version from npm; it is absent. Latest published version is 0.3.3.

## Current Focus

- Hypothesis: this is the documented release dependency, not five independent platform defects.
- Evidence: every platform has the same npm ETARGET error. PR #242 remains unmerged and contains conformance CLI 0.3.4. Its nine checks pass and GitHub reports it mergeable. Kehto CLI 0.5.5 and Paja 0.21.0 are now published.
- Next action: merge #242 and wait for publication only if the user authorizes that separate feature release. Retarget and rerun #243 after the real package exists.

## Evidence

- [Failed standalone run](https://github.com/napplet/web/actions/runs/38299057704): Linux x64/ARM64, macOS x64/ARM64, and Windows all fail on the same missing package.
- [PR #242](https://github.com/napplet/web/pull/242), head `44d663a14af0f91a3797614c76e5c3d684cec52e`: CI, conformance, links, slop, and all five standalone jobs passed. Release versions are already applied and no unconsumed changeset remains.
- npm registry checked directly: conformance CLI 0.3.4 absent; Kehto CLI 0.5.5 and Paja 0.21.0 present.
- The pinned package installation is the behavior under test. Skipping the check, substituting a local package, or downgrading to the old runner would conceal or remove the intended release behavior.

## Resolution

Root cause confirmed. Updated the stacked branch with #242's latest reviewed fixes and restored the CLI changelog's existing unwrapped history, leaving one focused 0.9.1 entry. Local verification passed: build (12 tasks), type-check (18 tasks), recursive unit tests, and diff whitespace checks. AI-slop passed at 98/100 with zero errors; the existing `fflate` dependency advisory is the sole warning.

Publication and final fresh-cache CI verification remain pending. The user was asked to authorize merging #242 because that ships a separate feature release. No dependency downgrade, local-package substitution, or test bypass was added.
