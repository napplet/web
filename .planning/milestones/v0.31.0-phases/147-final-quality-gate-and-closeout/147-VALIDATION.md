---
phase: 147
slug: final-quality-gate-and-closeout
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-24
---

# Phase 147 - Validation Strategy

Per-phase validation contract for final quality gate closeout.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | aislop, Vitest, TypeScript, tsup |
| **Config file** | `package.json`, `vitest.config.ts`, package `tsconfig.json`, package `tsup.config.ts` |
| **Quick run command** | `pnpm dlx aislop scan --json . && git diff --check` |
| **Full suite command** | `pnpm dlx aislop scan --json . && pnpm -r type-check && pnpm -r build && pnpm -r test:unit && git diff --check` |
| **Estimated runtime** | ~8 seconds |

## Sampling Rate

- **After every task commit:** Run the task-specific scanner or workspace command.
- **After every plan wave:** Run the full suite command.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 10 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 147-01-01 | 01 | 1 | GATE-01, GATE-02 | quality gate | Final scanner has zero errors, zero fixable findings, and only documented deferrals | scanner | `pnpm dlx aislop scan --json .` | yes | green |
| 147-01-02 | 01 | 1 | GATE-03 | regression | Workspace type-check, build, unit tests, and diff hygiene pass | workspace | `pnpm -r type-check && pnpm -r build && pnpm -r test:unit && git diff --check` | yes | green |
| 147-01-03 | 01 | 1 | GATE-04 | closeout | Final summary records changed files, simplifications, risks, and evidence | docs | `test -f .planning/phases/147-final-quality-gate-and-closeout/147-01-SUMMARY.md` | yes | green |

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
