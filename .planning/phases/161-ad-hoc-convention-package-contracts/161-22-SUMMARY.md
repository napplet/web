---
phase: 161-ad-hoc-convention-package-contracts
plan: "22"
subsystem: conformance-reference-shell
tags: [nap-inc, nap-intent, conformance, endpoint-attestation, delivery]
requires:
  - phase: 161-15
    provides: Queryless convention-URI normalization rules.
  - phase: 161-16
    provides: URI-derived intent request and delivery contracts.
provides:
  - Carrier validation for attested INC and no-ID intent delivery messages.
  - Reference runtime evidence for accepted intent delivery responsibility and exact INC routing.
affects: [conformance, reference-shell, nap-inc, nap-intent]
tech-stack:
  added: []
  patterns:
    - Source provenance is copied from an explicit authenticated endpoint at acceptance time.
    - Target deliveries are retained separately from immediate invoke results and drained by resolved target.
key-files:
  created: []
  modified:
    - packages/conformance/src/validators/envelope.ts
    - packages/conformance/src/validators/envelope.test.ts
    - packages/conformance/src/shell/reference-shell.ts
    - packages/conformance/src/shell/reference-shell.test.ts
key-decisions:
  - "Validate inbound carrier fields while retaining the outbound-only conformance verdict for napplet-emitted messages."
  - "Reference intent acceptance queues carrier-neutral delivery independently of INC and snapshots endpoint dTag before source lifecycle changes."
requirements-completed: [CONV-PKG-04, CONV-PKG-05]
metrics:
  tasks_completed: 2
  files_modified: 4
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 22: Endpoint-Attested Conformance Delivery Summary

**Conformance now distinguishes accepted intent delivery from later target delivery, while INC and intent sender provenance comes exclusively from an authenticated endpoint fixture.**

## Accomplishments

- Registered `intent.deliver` as an inbound carrier with its required delivery object and no correlation requirement.
- Required `inc.event` sender data, rejected caller-supplied `sender` on `inc.emit`, and kept convention/payload semantics outside carrier validation.
- Added `handleFrom(endpoint, envelope)` plus deterministic target-queue draining to the reference shell.
- Returned accepted intent results before independently queued target delivery; stable INC delivery routes only on exact complete topic equality.
- Advertised queryless intent contracts with optional same-contract event kinds and rejected convention/request identity conflicts before handler resolution.
- Added the source-lifetime regression: target delivery retains the dTag accepted from the endpoint even after that endpoint object changes.

## Task Commits

1. **Task 1: Validate one normalized invoke and one no-ID delivery carrier** — `e64846db` (RED), `6f40e394` (GREEN), `7b5c05a5` (stable fixture correction).
2. **Task 2: Model endpoint-attested INC and intent target delivery** — `98aa211d` (RED), `aa2238b7` (GREEN), `6a2f0c03` (source-lifetime regression).

## Verification

- `pnpm --filter @napplet/conformance test:unit -- envelope.test.ts` — pass (8 files, 66 tests).
- `pnpm --filter @napplet/conformance test:unit -- reference-shell.test.ts` — pass (8 files, 66 tests).
- `pnpm --filter @napplet/conformance build` — pass.
- `pnpm --filter @napplet/conformance type-check` — pass.
- `git diff --check` — pass.

## TDD Gate Compliance

- **RED:** `e64846db` and `98aa211d` recorded failing carrier and reference-shell expectations before implementation.
- **GREEN:** `6f40e394` and `aa2238b7` implemented the smallest conforming validator and runtime fixture behavior.

## Deviations from Plan

None - plan executed exactly as written. The post-tracer fixture and source-lifetime test refinements were requested review follow-ups within the plan's adopted contract.

## Known Stubs

None.

## Self-Check: PASSED

- Confirmed the four plan-owned source/test files and this summary exist.
- Confirmed all six task commits exist in git history.
- Confirmed no unrun verification, unexpected deletion, or new protocol surface beyond the adopted draft carriers.
