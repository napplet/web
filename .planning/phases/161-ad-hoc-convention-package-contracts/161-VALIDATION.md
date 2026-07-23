---
phase: 161
slug: ad-hoc-convention-package-contracts
status: draft
nyquist_compliant: true
wave_0_complete: true
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
| **Quick run command** | `pnpm --filter @napplet/core test:unit && pnpm --filter @napplet/nap test:unit && pnpm --filter @napplet/sdk type-check && pnpm --filter @napplet/skills test:unit && pnpm --filter @napplet/vite-plugin test:unit && pnpm --filter @napplet/conformance test:unit && pnpm --filter @napplet/cli test:unit` |
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
| 161-02-01, 161-02-02, 161-13-01, 161-13-02 | 161-02, 161-13 | 1, 4 | CONV-PKG-04 | T-161-04, T-161-05, T-161-06, T-161-37, T-161-38, T-161-39 | `emit(topic, payload?)` transposes convention-URI queries before exact routing and rejects ambiguous/malformed inputs before emission | unit + type-check | `pnpm --filter @napplet/nap test:unit -- inc-compat.test.ts && pnpm --filter @napplet/core type-check && pnpm --filter @napplet/nap type-check && pnpm --filter @napplet/sdk type-check` | ✅ `packages/nap/src/inc-compat.test.ts` exists; 161-13 extends its real `postMessage` envelope matrix | ⬜ pending |
| 161-05-01, 161-05-02, 161-05-03, 161-06-01, 161-06-02, 161-07-02, 161-07-03, 161-08-01, 161-09-01, 161-09-02, 161-11-01, 161-11-02, 161-12-01, 161-14-01, 161-14-02, 161-14-03 | 161-05, 161-06, 161-07, 161-08, 161-09, 161-11, 161-12, 161-14 | 0, 2, 3, 5, 6 | CONV-PKG-05 | T-161-13, T-161-14, T-161-15, T-161-16, T-161-17, T-161-18, T-161-20, T-161-22, T-161-23, T-161-24, T-161-25, T-161-26, T-161-27, T-161-31, T-161-32, T-161-33, T-161-34, T-161-35, T-161-36, T-161-40, T-161-41, T-161-42 | Active conformance, docs, and skills distinguish PR #89 NAP-INC query sugar from opaque NAP-INTENT/manifest conventions | unit + static scan + docs + tutorials + links | `pnpm test:convention-contracts && pnpm --filter @napplet/conformance test:unit && pnpm --filter @napplet/skills test:unit && pnpm test:tutorial && pnpm --filter @napplet/docs build && pnpm check:links` | ✅ guard, conformance, docs, tutorial, and skills test infrastructure exists; 161-14 corrects the pre-PR-89 README/skill baseline | ⬜ pending |
| 161-15-01, 161-17-01 | 161-15, 161-17 | 7, 8 | CONV-PKG-01, CONV-PKG-04 | T-161-43, T-161-44 | Shared URI syntax/rejection behavior feeds only INC emit and intent invoke/open | unit | `pnpm --filter @napplet/nap test:unit -- convention-uri.test.ts inc-compat.test.ts shim.test.ts` | ✅ existing INC/intent tests; 161-15 creates normalizer tests | ⬜ pending |
| 161-16-01, 161-16-02, 161-17-02 | 161-16, 161-17 | 7, 8 | CONV-PKG-01 | T-161-45, T-161-46 | Required identity, acceptance union, no lifecycle/result IDs, and lossless FIFO delivery | type + unit | `pnpm --filter @napplet/core type-check && pnpm --filter @napplet/nap test:unit -- shim.test.ts` | ✅ intent shim tests exist | ⬜ pending |
| 161-18-01, 161-19-01 | 161-18, 161-19 | 9 | CONV-PKG-01 | T-161-47 | NAP/SDK/shim expose URI invoke/open and onDelivery without client-side selection or INC | type + unit | `pnpm --filter @napplet/sdk type-check && pnpm --filter @napplet/shim test:unit` | ✅ shim injection suite exists | ⬜ pending |
| 161-20-01, 161-21-01 | 161-20, 161-21 | 7 | CONV-PKG-02, CONV-PKG-03 | T-161-48 | Queryless per-contract metadata preserves optional same-tag kinds | Vitest + Deno | `pnpm --filter @napplet/vite-plugin test:unit && pnpm --filter @napplet/cli test:unit` | ✅ producer tests exist | ⬜ pending |
| 161-22-01, 161-22-02 | 161-22 | 8 | CONV-PKG-05 | T-161-49, T-161-50 | Carrier validation plus explicit authenticated endpoint, accepted result, and separate target delivery | unit | `pnpm --filter @napplet/conformance test:unit` | ✅ envelope/reference-shell suites exist | ⬜ pending |
| 161-23-01, 161-24-01, 161-25-01, 161-26-01 | 161-23, 161-24, 161-25, 161-26 | 10, 11 | CONV-PKG-05 | T-161-51 | Active docs/skills/examples/guard prohibit stale handling, IDs, INC coupling, and three-element-only claims | docs + unit + static | `pnpm --filter @napplet/docs build && pnpm --filter @napplet/skills test:unit && pnpm test:tutorial && pnpm test:convention-contracts` | ✅ all infrastructure exists | ⬜ pending |
| 161-06-02, 161-10-01, 161-10-02, 161-10-03 | 161-06, 161-10 | 0, 12 | CONV-PKG-06 | T-161-16, T-161-17, T-161-18, T-161-28, T-161-29, T-161-30 | Task 1 changesets from commit fcb283ab are revised after Plans 15-26 and all repository gates are complete | integration/release | `pnpm type-check && pnpm build && pnpm -r test:unit && pnpm test:conformance && pnpm check:links && pnpm test:convention-contracts && git diff --check` | ✅ changesets exist and require revision | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] 161-06-01 creates the active-surface regression guard and fixture tests before every implementation plan; 161-06-02 wires its automated command into the root verification surface.
- [ ] 161-03-01 depends on 161-06 and adds focused Vite negative cases proving numbered NAP identifiers are rejected and `kind:` archetype metadata is never emitted.
- [ ] 161-04-01 and 161-04-02 depend on 161-06 and add CLI parsing/emission negative cases for numbered identifiers and invented constraints.
- [ ] 161-02-01 depends on 161-06 and adds exact-topic negative assertions proving query, prefix, wildcard, and canonical-equivalence normalization are absent.
- [ ] 161-13 adds PR #89 convention-URI transposition and strict rejection
  coverage without weakening the exact-topic receive assertions from 161-02.
- [ ] 161-14 updates post-161-08 README guidance, shipped skills, and the
  active-surface guard; 161-11/12 consume that clarified boundary and 161-10
  remains the final release gate.
- [ ] 161-15 and 161-16 establish the shared normalizer and public contract
  before 161-17 adds the delivery path.
- [ ] 161-20 and 161-21 run independently in Wave 7; same-wave ownership has no
  overlapping files.
- [ ] 161-23 through 161-25 own disjoint active author surfaces; 161-26 updates
  the guard only after those surfaces are current.
- [ ] 161-10 remains paused after Task 1 commit `fcb283ab`; it resumes only
  after all gap summaries exist and revises, rather than recreates, changesets.

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
- [ ] Plans 161-11, 161-12, 161-13, and 161-14 are represented in the task map and are dependencies of the final Plan 161-10 release gate

**Approval:** pending
