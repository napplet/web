---
status: in-progress
date: 2026-07-02
---

# Implement NAP-COUNT From napplet/naps PR #69

## Scope

- Add the canonical draft `count` NAP domain from live `napplet/naps` PR #69.
- Implement the filter-based `count.query` / `count.query.result` request-result surface.
- Preserve NIP-01 filter arrays and NIP-45 OR aggregation semantics by forwarding filters to the runtime unchanged.
- Return count metadata only; do not add event-specific helpers or event payload delivery.

## Implementation

- Add shared core count types and `NappletGlobal.count`.
- Add `@napplet/nap/count` types, shim, SDK helper, export maps, and tests.
- Wire `count` into `@napplet/shim` and `@napplet/sdk`.
- Add conformance validator/reference-shell coverage for the new envelopes.
- Update package/docs references and add release metadata.

## Verification

- Focused count shim tests.
- Focused type/build checks for touched packages.
- Full `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, slop scan, and `git diff --check`.

## Out of Scope

- No runtime relay/index/count implementation in these packages.
- No reaction/reply/repost/follower-specific methods.
- No local fetching of events to compute counts.
