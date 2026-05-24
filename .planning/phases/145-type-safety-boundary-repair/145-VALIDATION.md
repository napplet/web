---
phase: 145
slug: type-safety-boundary-repair
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-24
---

# Phase 145 - Validation Strategy

Per-phase validation contract for type-safety boundary repair.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest, TypeScript, tsup, aislop |
| **Config file** | `vitest.config.ts`, `packages/nub/vitest.config.ts`, package `tsconfig.json`, package `tsup.config.ts` |
| **Quick run command** | `pnpm --filter @napplet/nub test:unit && pnpm -r type-check` |
| **Full suite command** | `pnpm dlx aislop scan --json . && pnpm -r type-check && pnpm -r build && pnpm -r test:unit` |
| **Estimated runtime** | ~8 seconds |

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @napplet/nub test:unit` and `pnpm -r type-check`.
- **After every plan wave:** Run the full suite command.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 10 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 145-01-01 | 01 | 1 | TYPE-01 | type boundary | Global mounts avoid broad unsafe assertions | scanner/type-check | `pnpm dlx aislop scan --json . && pnpm -r type-check` | yes | green |
| 145-01-02 | 01 | 1 | TYPE-02 | type boundary | Message handlers avoid double assertions and retain no-op rejection | scanner/unit | `pnpm dlx aislop scan --json . && pnpm --filter @napplet/nub test:unit` | yes | green |
| 145-01-03 | 01 | 1 | TYPE-03, TYPE-04 | input boundary | Invalid and malformed handler inputs stay no-op | unit | `pnpm --filter @napplet/nub test:unit` | yes: `packages/nub/src/boundary-smoke.test.ts` | green |
| 145-01-04 | 01 | 1 | TYPE-01, TYPE-02, TYPE-03, TYPE-04 | regression | Type-boundary cleanup does not break package behavior | workspace | `pnpm dlx aislop scan --json . && pnpm -r type-check && pnpm -r build && pnpm -r test:unit` | yes | green |

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
