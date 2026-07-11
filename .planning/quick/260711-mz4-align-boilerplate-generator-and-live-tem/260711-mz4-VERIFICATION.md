---
status: passed
verified: 2026-07-11
mode: quick-full
quick_id: 260711-mz4
---

# Quick Task 260711-mz4 Verification

## Requirement Evidence

| Requirement | Evidence |
| --- | --- |
| Runtime injects domains; apps call SDK | Template `src/main.ts` imports SDK helpers; `src/domain-availability.ts` only checks truthy domain presence. |
| No stale shell handshake/probes | Exact scans returned zero active hits; both guidance suites reject direct, optional-chain, and bracket variants. |
| OUTBOX-first; RELAY is scoped escape | Starter calls `outbox.query`; app source has no RELAY calls; docs label the only RELAY snippet relay-local. |
| Hard-only requirements | Starter has no `requires`; guidance requires essential domains only; Vite preserves explicit/inferred `count`. |
| CONNECT/CLASS retired | Active surface scans returned zero; remaining mentions are explicitly deferred. |
| No forked skill bodies | Generated `.codex/skills` contains only the official-package pointer README. |
| Current package surfaces | Generated lock resolves SDK 0.24.4, vite-plugin 0.11.2, and conformance-cli 0.2.15. |
| Drift checks | Boilerplate 2/2, skills 14/14, template guidance 5/5, vite-plugin 23/23. |

## Command Evidence

- `pnpm build` — 13 successful / 13 total.
- `pnpm type-check` — 17 successful / 17 total.
- `pnpm -r test:unit` — all workspace unit suites passed.
- `pnpm test` — JSR exports, 23 Turbo test tasks, tutorial build, and tutorial
  conformance passed.
- Template `pnpm verify` — guidance, type-check, and build passed.
- Template and generated-app `pnpm test:conformance` — 5 passed, 0 failed,
  5 skipped, `RESULT: CONFORMANT`.
- Artifact check — `dist/index.html` is the only output file and contains no
  external script/link asset references.
- `pnpm dlx aislop@0.13.1 scan --changes --base origin/main .` — 100/100 in
  both repositories.
- `git diff --check` — passed in both repositories.

## Evidence Boundary

The local-directory conformance invocation skips all three manifest checks,
wire-envelope validation, and lifecycle teardown because no signed manifest
event or runtime interactions are supplied. Documentation and PR reports state
those skips explicitly.

## Review Verdict

Independent read-only review: APPROVE; no unresolved HIGH, MEDIUM, or LOW
findings after corrections.
