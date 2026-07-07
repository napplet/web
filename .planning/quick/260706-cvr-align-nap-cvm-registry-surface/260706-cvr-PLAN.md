---
quick_id: 260706-cvr
slug: align-nap-cvm-registry-surface
status: complete
date: 2026-07-06
---

# Quick Task 260706-cvr: Align NAP-CVM Registry Surface

## Goal

Align the implemented `cvm` package surface with the live `napplet/naps` NAP-CVM
draft by adding the `cvm.registry.*` message/API family.

## Evidence Inputs

- `napplet/naps` PR #31 (`origin/nap-cvm`, `naps/NAP-CVM.md`) defines
  `registry.list`, `registry.has`, `registry.describe`, and `registry.call`.
- Current `@napplet/nap/cvm` implements only `discover`, `request`, `close`,
  and `event`, so the eight registry request/result wire messages are absent.
- Other implemented domains' wire message sets matched their current spec source
  after filtering to actual wire tables; NAP-INC and NAP-OUTBOX were manually
  checked because the first mechanical pass produced false positives.

## Tasks

1. Add NAP-CVM registry value and wire types.
2. Add shim request/response correlation and SDK helpers for the registry family.
3. Update core injected-domain typings, conformance envelope specs, exports, docs,
   and tests.
4. Run focused and workspace verification, then open this as the CVM-specific PR.

## Verification

- `pnpm --filter @napplet/nap test:unit -- --runInBand`
- `pnpm --filter @napplet/core type-check`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/conformance type-check`
- `pnpm --filter @napplet/conformance test:unit -- --runInBand`
- `pnpm --filter @napplet/shim test:unit -- --runInBand`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm check:jsr`
- `npx -y aislop@0.12.0 scan --changes`
- `node scripts/check-links.mjs http://localhost:8099`
- `git diff --check`

## Result

Complete. The implementation now exposes the NAP-CVM `cvm.registry.*`
request/result family across core types, `@napplet/nap/cvm`, SDK helpers,
runtime injection, conformance envelope specs, docs, and regression tests.

The mechanical NAP wire-message audit found CVM as the only confirmed package
gap after manual review of parser false positives in NAP-INC, NAP-KEYS, and
NAP-OUTBOX. NAP-OUTBOX `RelayEventResult.sidecar` support was already present
on current `main`.
