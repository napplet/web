---
phase: 144
slug: fixable-lint-and-slop-cleanup
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-24
---

# Phase 144 - Validation Strategy

Per-phase validation contract for fixable lint and AI-slop cleanup.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | aislop, TypeScript, tsup, Vitest |
| **Config file** | `package.json`, `vitest.config.ts`, package `tsconfig.json`, package `tsup.config.ts` |
| **Quick run command** | `git diff --check && pnpm dlx aislop scan --json .` |
| **Full suite command** | `pnpm dlx aislop scan --json . && pnpm -r type-check && pnpm -r build && pnpm -r test:unit` |
| **Estimated runtime** | ~8 seconds |

## Sampling Rate

- **After every task commit:** Run `git diff --check` and the scanner for touched categories.
- **After every plan wave:** Run the full suite command.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 10 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 144-01-01 | 01 | 1 | SLOP-01, SLOP-02, SLOP-03 | quality gate | Mechanical fixes are limited to scanner-targeted categories | scanner | `pnpm dlx aislop scan --json . && git diff --check` | yes | green |
| 144-01-02 | 01 | 1 | LINT-01, LINT-02 | quality gate | Duplicate and unused imports are absent | scanner | `pnpm dlx aislop scan --json .` | yes | green |
| 144-01-03 | 01 | 1 | LINT-03, SLOP-01, SLOP-02 | quality gate | Console leftovers and trivial/decorative comments are absent | scanner | `pnpm dlx aislop scan --json .` | yes | green |
| 144-01-04 | 01 | 1 | LINT-04 | regression | Central shim duplicate logic is collapsed without install regression | workspace | `pnpm -r type-check && pnpm -r build && pnpm -r test:unit` | yes | green |
| 144-01-05 | 01 | 1 | LINT-01, LINT-02, LINT-03, LINT-04, SLOP-01, SLOP-02, SLOP-03 | regression | Cleanup does not break package behavior | workspace | `pnpm dlx aislop scan --json . && pnpm -r type-check && pnpm -r build && pnpm -r test:unit` | yes | green |

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
