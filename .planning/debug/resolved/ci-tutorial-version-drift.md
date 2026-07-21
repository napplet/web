---
status: resolved
trigger: "https://github.com/napplet/web/actions/runs/29172642899/job/86596224306 is failing"
created: 2026-07-14
updated: 2026-07-14
---

# Debug Session: ci-tutorial-version-drift

## Symptoms

- Expected: the `CI` workflow passes on `main` after a Version Packages merge.
- Actual: run `29172642899`, job `86596224306`, fails in `Run pnpm test`.
- Exact failure: `Tutorial @napplet/vite-plugin version is ^0.11.2; expected ^0.11.3`.
- Scope: type-check, build, Playwright setup, and package unit tests all pass before
  `pnpm test:tutorial` rejects a compatible tutorial dependency range.
- Recurrence: run `29105541698` failed the same assertion after the preceding
  Version Packages merge bumped `@napplet/conformance-cli`.

## Current Focus

- Confirmed root cause: `assertPackageVersions()` treated the tutorial's caret
  dependency range as an exact textual pin. `^0.11.2` already includes the patch
  release `0.11.3`; it correctly excludes the 0.x minor boundary `0.12.0`.
- Fix: validate stable workspace versions against the declared `^x.y.z` range,
  while continuing to reject missing, malformed, broadened, older, and breaking
  version declarations.
- Verification evidence: focused and full repository checks pass; an independent
  review found no blocking issues and an exhaustive reference comparison found
  no caret-semantic mismatches in the supported stable range domain.
- Next action: ship the PR and confirm its live GitHub checks.

## Evidence

- Live workflow log identifies `scripts/test-tutorial.mjs:100` as the throw site.
- `origin/main` is `13a778af` (`Version Packages (#166)`).
- `packages/vite-plugin/package.json` and `jsr.json` were bumped from `0.11.2` to
  `0.11.3` in that commit.
- The two tutorial guides still contain `@napplet/vite-plugin` range `^0.11.2`.
- The installed `semver` reference implementation accepts `0.11.3` for
  `^0.11.2` and rejects `0.12.0`.
- `pnpm test:tutorial` now passes: 3 range regression tests pass, the tutorial
  app builds, and conformance reports 5 passed / 0 failed / 5 skipped.

## Eliminated

- Runner provisioning: Playwright installation completed successfully.
- Package implementation regression: all package unit tests passed.
- Transient GitHub failure: the error is a deterministic local version assertion.
- Missing tutorial synchronization: patch releases remain valid under the
  existing caret ranges, so rewriting docs after every patch would encode an
  unnecessary latest-patch policy.

## Resolution

- Root cause: exact-string comparison enforced a latest-patch policy that caret
  ranges do not express, producing deterministic false failures after compatible
  package patch releases.
- Fix: add a dependency-free stable caret-range checker and use it in the
  tutorial package assertion; run its regression tests as part of
  `pnpm test:tutorial`.
- Verification completed:
  - `pnpm build`
  - `pnpm type-check`
  - `pnpm -r test:unit`
  - `pnpm test`
  - `pnpm test:tutorial` (3 range tests; tutorial conformant with 0 failures)
  - `pnpm lint` (no lint tasks configured)
  - 4,096 stable caret/version pairs cross-checked against `semver@7.7.4`
    with 0 mismatches
  - independent review: no blocking findings
  - `pnpm dlx aislop@0.13.1 scan --changes --json .` (100/100)
  - `git diff --check`
