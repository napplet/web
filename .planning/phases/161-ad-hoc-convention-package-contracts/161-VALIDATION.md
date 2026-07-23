---
phase: 161
slug: ad-hoc-convention-package-contracts
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-23
---

# Phase 161 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest for TypeScript packages; Deno test for `@napplet/cli` |
| **Config file** | Package-local Vitest configs; `packages/cli/deno.json` |
| **Quick run command** | `pnpm --filter @napplet/core test:unit && pnpm --filter @napplet/nap test:unit && pnpm --filter @napplet/vite-plugin test:unit && pnpm --filter @napplet/conformance test:unit && pnpm --filter @napplet/cli test:unit` |
| **Full suite command** | `pnpm type-check && pnpm build && pnpm -r test:unit && pnpm test:conformance && pnpm check:links && git diff --check` |
| **Estimated runtime** | ~600 seconds |

---

## Sampling Rate

- **After every task commit:** Run the changed package's unit tests and type-check.
- **After every plan wave:** Run `pnpm type-check && pnpm build && pnpm -r test:unit`.
- **Before `$gsd-verify-work`:** Full suite, docs/link checks, AI-slop gate, active-surface scan, and `git diff --check` must be green.
- **Max feedback latency:** 600 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 161-01-01, 161-01-02, 161-07-01 | 161-01, 161-07 | 1, 3 | CONV-PKG-01 | T-161-01, T-161-02, T-161-03, T-161-19, T-161-21 | Opaque convention values; no legacy contract aliases | unit + type-check | `pnpm --filter @napplet/core test:unit && pnpm --filter @napplet/nap test:unit && pnpm type-check` | ✅ `packages/nap/src/intent/shim.test.ts` exists; extend during 161-01 | ⬜ pending |
| 161-03-01 | 161-03 | 1 | CONV-PKG-02 | T-161-07, T-161-08, T-161-09 | Emit only documented three-element archetype tags | unit | `pnpm --filter @napplet/vite-plugin test:unit` | ✅ `packages/vite-plugin/src/index.test.ts` exists; add negative cases after 161-06 | ⬜ pending |
| 161-04-01, 161-04-02, 161-04-03 | 161-04 | 1 | CONV-PKG-03 | T-161-10, T-161-11, T-161-12 | Reject numbered inputs and omit invented constraints | Deno unit | `pnpm --filter @napplet/cli test:unit` | ✅ CLI config, wizard, and manifest tests exist; add negative cases after 161-06 | ⬜ pending |
| 161-02-01, 161-02-02 | 161-02 | 1 | CONV-PKG-04 | T-161-04, T-161-05, T-161-06 | Exact opaque topic routing; no query/prefix normalization | unit + static scan | `pnpm --filter @napplet/nap test:unit && pnpm test:convention-contracts` | ✅ `packages/nap/src/inc-compat.test.ts` exists; add exact-topic negative assertions after 161-06 | ⬜ pending |
| 161-05-01, 161-05-02, 161-05-03, 161-06-01, 161-06-02, 161-07-02, 161-07-03, 161-08-01, 161-09-01, 161-09-02, 161-11-01, 161-11-02, 161-12-01 | 161-05, 161-06, 161-07, 161-08, 161-09, 161-11, 161-12 | 0, 2, 3 | CONV-PKG-05 | T-161-13, T-161-14, T-161-15, T-161-16, T-161-17, T-161-18, T-161-20, T-161-22, T-161-23, T-161-24, T-161-25, T-161-26, T-161-27, T-161-31, T-161-32, T-161-33, T-161-34, T-161-35, T-161-36 | Active conformance, docs, and skills teach conventions only | unit + static scan + docs + tutorials + links | `pnpm test:convention-contracts && pnpm --filter @napplet/conformance test:unit && pnpm --filter @napplet/skills test:unit && pnpm test:tutorial && pnpm --filter @napplet/docs build && pnpm check:links` | ❌ 161-06 creates `scripts/test-convention-contracts.mjs` and its test; ✅ conformance, docs, tutorial, and skills test infrastructure exists | ⬜ pending |
| 161-06-02, 161-10-01, 161-10-02, 161-10-03 | 161-06, 161-10 | 0, 4 | CONV-PKG-06 | T-161-16, T-161-17, T-161-18, T-161-28, T-161-29, T-161-30 | Release metadata and repository gates are complete | integration/release | `pnpm type-check && pnpm build && pnpm -r test:unit && pnpm test:conformance && pnpm check:links && pnpm test:convention-contracts && git diff --check` | ✅ repository gate infrastructure exists; ❌ 161-10 creates both Phase 161 changesets | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] 161-06-01 creates the active-surface regression guard and fixture tests before every implementation plan; 161-06-02 wires its automated command into the root verification surface.
- [ ] 161-03-01 depends on 161-06 and adds focused Vite negative cases proving numbered NAP identifiers are rejected and `kind:` archetype metadata is never emitted.
- [ ] 161-04-01 and 161-04-02 depend on 161-06 and add CLI parsing/emission negative cases for numbered identifiers and invented constraints.
- [ ] 161-02-01 depends on 161-06 and adds exact-topic negative assertions proving query, prefix, wildcard, and canonical-equivalence normalization are absent.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 600s
- [ ] `nyquist_compliant: true` set in frontmatter
- [ ] Plans 161-08, 161-11, and 161-12 have disjoint file ownership and collectively cover all 23 researched documentation files
- [ ] Plans 161-11 and 161-12 are represented in the task map and are dependencies of the final Plan 161-10 release gate

**Approval:** pending
