---
phase: 162-blossom-backed-large-asset-optimization
plan: "11"
subsystem: release-security
tags: [changesets, secret-scanner, aislop, pnpm, blossom, vite]
requires:
  - phase: 162-10
    provides: Reproducible bounded Blossom optimization demonstration and evidence vectors.
provides:
  - Bounded non-echoing scanner for outward-facing secret-shaped material.
  - Release metadata and durable 50 MiB optimization evidence.
  - A reviewed, pushed PR with branch-wide quality and dependency remediation.
affects: [release, vite-plugin, build-tools, cli]
tech-stack:
  added: []
  patterns: [bounded artifact scanning, explicit-path release commits, branch-wide AI-slop remediation]
key-files:
  created:
    - scripts/check-build-secret-leaks.mjs
    - scripts/check-build-secret-leaks.test.mjs
    - .changeset/tidy-blossom-assets.md
    - .planning/phases/162-blossom-backed-large-asset-optimization/162-DEMO.md
  modified:
    - pnpm-workspace.yaml
    - pnpm-lock.yaml
    - packages/cli/src/deploy-signer.ts
    - packages/cli/src/nostr-connect.ts
key-decisions:
  - "Treat the emitted resource mapping and loader as non-normative private artifact bytes; use only existing NAP-RESOURCE whole-Blob operations at runtime."
  - "Release all three changed 0.x packages as minors because each has shipped behavior additions."
  - "Use pnpm overrides and its lockfile, rather than user-owned root manifests/locks, to remediate transitive advisories."
patterns-established:
  - "Run the secret scanner over explicit outward roots, the staged diff, and PR prose before pushing."
  - "Keep generated link-check assembly outside the worktree after verification so branch scanning remains source-only."
requirements-completed: []
coverage:
  - id: D1
    description: Bounded scanner detects secret-shaped outward artifacts without echoing values.
    verification:
      - kind: unit
        ref: node --test scripts/check-build-secret-leaks.test.mjs
        status: pass
      - kind: other
        ref: node scripts/check-build-secret-leaks.mjs
        status: pass
    human_judgment: false
  - id: D2
    description: Reproducible 50 MiB fixture proves bounded optimization, deterministic selection, and byte-identical recovery.
    verification:
      - kind: integration
        ref: pnpm --filter @napplet/vite-plugin test:unit -- optimizer/large-fixture.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Release branch is quality-gated, dependency-audited, pushed, and reviewable.
    verification:
      - kind: other
        ref: npm test; pnpm audit --prod; npx --yes aislop@0.12.0 scan --changes --base origin/main
        status: pass
    human_judgment: false
duration: 15m
completed: 2026-08-21
status: complete
---

# Phase 162 Plan 11: Release Evidence and Branch Audit Summary

**Bounded secret scanning, full release evidence, dependency remediation, and a 100/100 reviewed PR for deterministic Blossom-backed asset optimization.**

## Performance

- **Duration:** 15 minutes
- **Started:** 2026-08-21T18:11:39Z
- **Completed:** 2026-08-21T18:24:00Z
- **Tasks:** 2/2
- **Files modified:** 18

## Accomplishments

- Added a capped, fail-closed scanner for generated output, reports, evidence, staged diffs, and PR text that reports only safe path/rule diagnostics.
- Recorded the deterministic seven-asset, 57,671,680-byte demonstration; final HTML is 8,366 bytes and the test verifies recovery and aggregate integrity.
- Added minor changesets for `@napplet/vite-plugin`, `@napplet/build-tools`, and `@napplet/cli`; no local publishing occurred.
- Restored the branch to an AI-slop 100/100 clean scan, split overlong CLI helpers without API changes, and resolved postcss, nanoid, and js-yaml advisory paths with workspace overrides and the pnpm lockfile.
- Pushed `feat/vite-plugin-blossom-optimization` and opened [PR #205](https://github.com/napplet/web/pull/205).

## Verification

- `node --test scripts/check-build-secret-leaks.test.mjs && node scripts/check-build-secret-leaks.mjs` — pass.
- `deno check --config packages/cli/deno.json packages/build-tools/src/index.ts` and `deno test --allow-all packages/cli/tests` — pass; 122 CLI tests.
- `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, and `npm test` — pass.
- Assembled static site link crawl with `LINK_CHECK_BASE=http://127.0.0.1:8099 pnpm check:links` — 23 internal URLs, zero broken links. The environment routes `localhost:8099` to an unrelated 426 service, so the supported base override reached the prescribed local server.
- `pnpm check:jsr`, `pnpm test:release-tooling`, and `pnpm audit --prod` — pass; audit reports no known vulnerabilities.
- `pnpm --filter @napplet/vite-plugin test:unit -- optimizer/large-fixture.test.ts` — 79 tests pass.
- `npx --yes aislop@0.12.0 scan --changes --base origin/main` — 100/100, zero diagnostics.
- `git diff --check` — pass; branch diff excludes user-owned root package/lock/config changes and untracked cache, generated-binary, and workshop paths.

## Task Commits

1. **Task 1: Add a focused outward-artifact secret scanner** — `49dcc627` (RED test), `ebdff085` (implementation), `177cb29a` (regression test), `c1353ebe` (mixed-redaction fix), and `dae1a7f3` (quality cleanup).
2. **Task 2: Record evidence, pass full gates, version packages, and open the PR** — `196454a4` (branch audit/dependency remediation), `bf9c29bc` and `4429585d` (CLI file-limit refactors), `9a87c913` (changeset/evidence), and `27e19198` (PR URL).

## Files Created/Modified

- `scripts/check-build-secret-leaks.mjs` and `scripts/check-build-secret-leaks.test.mjs` — safe bounded scanner and coverage.
- `.changeset/tidy-blossom-assets.md` — minor release intent for each shipped package.
- `162-DEMO.md` — commands, tool versions, deterministic size/hash evidence, protocol boundary, and PR URL.
- `pnpm-workspace.yaml` and `pnpm-lock.yaml` — advisory-safe transitive dependency controls without touching the user-owned root manifests/lockfile.
- `packages/cli/src/nostr-connect-terminal.ts` and `packages/cli/src/deploy-signer-remote.ts` — extracted helpers that retain public behavior while satisfying the quality gate.

## Decisions Made

- The NIP-5D/NIP-5A and NAP-RESOURCE living documents retain protocol authority. Loader/map bytes remain implementation-private and use existing whole-Blob operations only.
- The CLI shipped behavior is a minor release, not a patch, alongside the Vite plugin and build-tools additions.
- JS-YAML 4 compatibility was established for `read-yaml-file` before pinning the transitive override, then validated by frozen install and all release tooling/tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected mixed redacted-secret scanning**
- **Found during:** Task 1
- **Issue:** A redacted marker could suppress detection of another secret-shaped value in the same scanned file.
- **Fix:** Added a mixed-content regression test and evaluated each secret rule independently.
- **Files modified:** `scripts/check-build-secret-leaks.mjs`, `scripts/check-build-secret-leaks.test.mjs`
- **Verification:** Scanner unit suite and staged/evidence scans pass.
- **Committed in:** `177cb29a`, `c1353ebe`

**2. [Rule 2 - Missing critical release quality] Remediated all branch-owned audit diagnostics**
- **Found during:** Task 2
- **Issue:** The pinned branch scan reported AI-slop findings and three dependency advisories, blocking the release gate.
- **Fix:** Reworked affected helpers below configured limits, split two CLI modules preserving their public interfaces, removed diagnostics from branch-owned source, and added verified pnpm overrides for postcss, nanoid, and js-yaml.
- **Files modified:** `pnpm-workspace.yaml`, `pnpm-lock.yaml`, CLI helper modules, Vite optimizer modules, and tests.
- **Verification:** `pnpm install --frozen-lockfile`, full build/type/unit/release tests, `pnpm audit --prod`, and exact AI-slop scan pass.
- **Committed in:** `196454a4`, `bf9c29bc`, `4429585d`

**Total deviations:** 2 auto-fixed (1 Rule 1, 1 Rule 2).
**Impact on plan:** Both changes were necessary to meet the plan's security/release gates; no protocol surface was added.

## Issues Encountered

The link checker defaults to `localhost:8099`, which this environment resolves to a 426 service rather than the locally started Python server. The supported `LINK_CHECK_BASE=http://127.0.0.1:8099` override validated the same assembled static site successfully, and the generated `site/` directory was removed before the final branch scan.

## User Setup Required

None - no external service configuration or local publish operation is required.

## Next Phase Readiness

The branch is pushed and PR #205 is open with release evidence, changesets, and full verification. Existing unrelated dirty paths remain untouched and unstaged.

## Self-Check: PASSED

Confirmed all four created deliverables on disk and every listed 162-11 task commit in repository history.

---
*Phase: 162-blossom-backed-large-asset-optimization*
*Completed: 2026-08-21*
