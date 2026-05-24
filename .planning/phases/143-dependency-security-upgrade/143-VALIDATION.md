---
phase: 143
slug: dependency-security-upgrade
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-24
---

# Phase 143 - Validation Strategy

Per-phase validation contract for dependency security cleanup.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pnpm scripts, aislop, Vitest, TypeScript, tsup |
| **Config file** | `package.json`, `vitest.config.ts`, package `tsconfig.json`, package `tsup.config.ts` |
| **Quick run command** | `pnpm why vite && pnpm why postcss && pnpm why turbo` |
| **Full suite command** | `pnpm dlx aislop scan --json . && pnpm -r type-check && pnpm -r build && pnpm -r test:unit` |
| **Estimated runtime** | ~8 seconds |

## Sampling Rate

- **After every task commit:** Run the relevant dependency or lockfile check from the task.
- **After every plan wave:** Run `pnpm dlx aislop scan --json . && pnpm -r type-check && pnpm -r build && pnpm -r test:unit`.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 10 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 143-01-01 | 01 | 1 | SEC-01, SEC-02 | dependency advisory | Manifest ranges target patched tooling versions | dependency graph | `pnpm why vite && pnpm why turbo` | yes | green |
| 143-01-02 | 01 | 1 | SEC-02 | dependency advisory | Lockfile resolves patched PostCSS and Turbo versions | dependency graph | `pnpm why postcss && pnpm why turbo` | yes | green |
| 143-01-03 | 01 | 1 | SEC-03 | dependency advisory | Scanner has no vulnerable-dependency diagnostics | scanner | `pnpm dlx aislop scan --json .` | yes | green |
| 143-01-04 | 01 | 1 | SEC-04 | regression | Dependency upgrade does not break packages | workspace | `pnpm -r type-check && pnpm -r build && pnpm -r test:unit` | yes | green |

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
