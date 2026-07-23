---
phase: 161-ad-hoc-convention-package-contracts
plan: "24"
subsystem: documentation
tags: [intent, inc, convention-uri, manifests, tutorials]
requires:
  - phase: 161-18
    provides: URI-shaped NAP and SDK intent facades
  - phase: 161-21
    provides: CLI per-contract event-kind metadata
provides:
  - Current package and protocol-reference documentation for the adopted URI contract
  - Runnable tutorials that preserve queryless manifest identity and separate intent acceptance from delivery
affects: [phase-161-guard, phase-161-release]
requirements-completed: [CONV-PKG-05]
status: complete
completed: 2026-07-23
---

# Phase 161 Plan 24: Active Documentation Contract Summary

All active docs-site package references, concepts, NAP guidance, and Note Drafts
tutorials now describe the exact PR #89-#91 boundary implemented by the
packages.

## Accomplishments

- Documented URI-authoritative INC emission and intent invocation while keeping
  subscriptions, manifest discovery, normalized wire identities, and routing
  queryless and exact.
- Separated immediate intent acceptance from later target-only `onDelivery`,
  with runtime-attested sender, untrusted payload, no public delivery ID, and no
  public NAP-INC dependency.
- Preserved the web projection's `MessageEvent.source` endpoint explanation
  without making it a carrier-neutral NAP mechanism.
- Updated CLI and tutorial metadata examples for optional same-tag
  `eventKinds`, without inventing an event-kind flag or wizard syntax.
- Linked the exact adopted draft heads for PRs #89, #90, and #91.

## Commits

- `9b798658` — docs(161-24): align package intent references
- `2c7072b7` — docs(161-24): explain normalized intent delivery
- `6c84816c` — docs(161-24): update tutorial convention contracts

## Verification

- `pnpm --filter @napplet/core build` — passed.
- `pnpm --filter @napplet/nap build` — passed.
- `pnpm --filter @napplet/sdk build` — passed.
- `pnpm --filter @napplet/shim build` — passed.
- `pnpm --filter @napplet/docs build` — passed after each documentation tranche.
- `pnpm test:tutorial` — passed, including the materialized tutorial build and
  conformance run.
- `node scripts/check-links.mjs http://127.0.0.1:18099` against an assembled
  temporary web/docs site — 23 internal URLs checked, no broken links. Port
  `8099` was already occupied by unrelated local services, so the same checker
  fixture ran on `18099`.

## Deviations

None.
