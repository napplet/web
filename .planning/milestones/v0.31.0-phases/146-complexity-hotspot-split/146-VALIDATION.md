---
phase: 146
slug: complexity-hotspot-split
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-24
---

# Phase 146 - Validation Strategy

Per-phase validation contract for complexity hotspot splitting.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest, TypeScript, tsup, aislop |
| **Config file** | `vitest.config.ts`, `packages/nub/vitest.config.ts`, package `tsconfig.json`, package `tsup.config.ts` |
| **Quick run command** | `pnpm --filter @napplet/nub test:unit && pnpm -r type-check` |
| **Full suite command** | `pnpm dlx aislop scan --json . && pnpm -r type-check && pnpm -r build && pnpm -r test:unit` |
| **Estimated runtime** | ~8 seconds |

## Sampling Rate

- **After every task commit:** Run relevant package tests plus `pnpm -r type-check`.
- **After every plan wave:** Run the full suite command.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 10 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 146-01-01 | 01 | 1 | QUAL-01 | regression | Origin normalizer keeps valid/invalid cases and aggregate-hash fixture stable | unit/scanner | `pnpm --filter @napplet/nub test:unit && pnpm dlx aislop scan --json .` | yes: `packages/nub/src/connect/aggregate-hash.test.ts` | green |
| 146-01-02 | 01 | 1 | QUAL-02 | regression | Vite plugin helper split preserves emitted behavior and closes function-length warnings | build/scanner | `pnpm -r type-check && pnpm -r build && pnpm dlx aislop scan --json .` | yes | green |
| 146-01-03 | 01 | 1 | QUAL-03, QUAL-04 | structural debt | Oversized public files are either reduced or explicitly deferred | scanner/docs | `pnpm dlx aislop scan --json .` | yes: `146-01-SUMMARY.md` | green |
| 146-01-04 | 01 | 1 | QUAL-01, QUAL-02, QUAL-03, QUAL-04 | regression | Complexity cleanup preserves workspace behavior | workspace | `pnpm dlx aislop scan --json . && pnpm -r type-check && pnpm -r build && pnpm -r test:unit` | yes | green |

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

## Manual-Only Verifications

All phase behaviors have automated verification.

## Validation Sign-Off

- [x] All tasks have automated verify commands.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency < 10s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-05-24
