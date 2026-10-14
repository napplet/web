---
status: resolved
trigger: "PR #243 tests are red across the board"
created: 2026-10-13
updated: 2026-10-14
---

# PR #243 runner publication dependency

## Symptoms

- Expected: the standalone CLI provisions its pinned tools from npm with an empty PATH and a fresh cache on all five platforms.
- Actual: every job in run 38299057704 fails during the first screenshot command.
- Error: `No matching version found for @napplet/conformance-cli@0.3.4.`
- Original reproduction: installing that exact package version from npm failed because only 0.3.3 was published.

## Current Focus

- Cause: the documented release dependency. All five jobs in run 38520521467 failed with npm ETARGET for conformance CLI 0.3.4.
- Current state: PR #242 merged after nine fresh checks passed. Its npm and JSR publication workflows succeeded, the four required npm tarballs return HTTP 200, and this branch includes the released main commit.
- Next action: retarget #243 to main and verify all five platforms on the updated PR head.

## Evidence

- [Failed standalone run](https://github.com/napplet/web/actions/runs/38299057704): Linux x64/ARM64, macOS x64/ARM64, and Windows all fail on the same missing package.
- [PR #242](https://github.com/napplet/web/pull/242), head `44d663a14af0f91a3797614c76e5c3d684cec52e`: CI, conformance, links, slop, and all five standalone jobs passed. Release versions are already applied and no unconsumed changeset remains.
- Initial npm registry check: conformance CLI 0.3.4 absent; Kehto CLI 0.5.5 and Paja 0.21.0 present.
- [PR #242](https://github.com/napplet/web/pull/242) merged as `839000563f6b92293a1e94ae0cd3a63011139448` on October 14 after its updated head passed all nine checks. [npm publication](https://github.com/napplet/web/actions/runs/38598414641) and [JSR publication](https://github.com/napplet/web/actions/runs/38598414611) succeeded.
- Direct npm download checks returned HTTP 200 for core 0.34.0, nap 0.34.0, conformance 0.20.0, and conformance CLI 0.3.4. Published conformance CLI metadata requires Paja `>=0.21.0 <0.22.0` and core/nap 0.34.0, matching the reviewed peer compatibility fix.
- The compiled macOS ARM64 binary passed `standalone_integration_test.ts` against real npm packages with an empty PATH and a fresh cache: 1 passed, 0 failed, 1m20s. This covered screenshot generation, deployment dry-run, conformance, Paja startup, and cache reuse with network access disabled by invalid proxies.
- The pinned package installation is the behavior under test. Skipping the check, substituting a local package, or downgrading to the old runner would conceal or remove the intended release behavior.

## Resolution

Root cause confirmed. Updated the stacked branch with #242's latest reviewed fixes and restored the CLI changelog's existing unwrapped history, leaving one focused 0.9.1 entry. Local verification passed: build (12 tasks), type-check (18 tasks), recursive unit tests, and diff whitespace checks. The final full AI-slop scan passed at 95/100 with zero errors; warnings concern existing function length, nesting, and the `fflate` dependency advisory in files unchanged by this PR.

The release blocker is resolved: required packages are published and downloadable, the branch includes released main, and the local compiled binary passed fresh-cache verification. Remote platform results are tracked in #243's checks. No dependency downgrade, local-package substitution, or test bypass was added.
