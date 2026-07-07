---
quick_id: 260706-cmn
slug: align-common-profile-result
status: complete
date: 2026-07-06
---

# Quick Task 260706-cmn: Align NAP-COMMON Profile Result

## Goal

Align `common.getProfile.result` with the live `napplet/naps` NAP-COMMON draft
by replacing the stale split `event?` / `relays?` payload shape with the
NAP-defined `result?: RelayEventResult`.

## Evidence Inputs

- `napplet/naps` PR #67 (`origin/nap-common`, `naps/NAP-COMMON.md`) defines
  `common.getProfile.result` payload fields as `id`, `ok`, `pubkey`,
  `profile?`, `result?`, and `error?`.
- Current `@napplet/core` exposes `CommonProfileResult.event?` and `relays?`
  instead of the relay-owned `RelayEventResult` wrapper.
- The field-level audit classified this as a real NAP-COMMON gap rather than a
  parser artifact or spec-authorized error-path optionality.

## Tasks

1. Update shared Common profile result types to import and expose
   `RelayEventResult`.
2. Update Common exports, shim tests, conformance fixtures/specs, and package
   docs that mention profile result shape.
3. Add a changeset for affected published packages.
4. Run focused and workspace verification, then open a Common-specific PR.

## Verification

- `pnpm --filter @napplet/core type-check`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/conformance test:unit -- --runInBand`
- `pnpm --filter @napplet/conformance type-check`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm check:jsr`
- `npx -y aislop@0.12.0 scan --changes`
- `node scripts/check-links.mjs http://localhost:8099`
- `git diff --check`

## Result

Complete. `CommonProfileResult` now exposes `result?: RelayEventResult`, matching
the NAP-COMMON wire row for `common.getProfile.result`. The stale `event?` and
`relays?` split fields were removed from the shared public type.

The Common shim regression test now delivers a profile result with
`result.sidecar.relayHints` and asserts the wrapper is preserved through the
request correlation path.
