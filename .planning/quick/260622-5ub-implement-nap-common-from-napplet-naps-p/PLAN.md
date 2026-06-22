# Implement NAP-COMMON From napplet/naps PR #67

## Scope

- Add the canonical `common` NAP domain from live `napplet/naps` PR #67.
- Implement only shell-mediated request/result surfaces:
  - `encodeNip19`
  - `decodeNip19`
  - `getProfile`
  - `follows`
  - `follow`
  - `unfollow`
  - `react`
  - `report`
- Use the resolved spec field `nip19Type`; do not add a top-level result `type`
  field beyond the envelope discriminant.

## Implementation

- Add shared core types and `NappletGlobal.common`.
- Add `@napplet/nap/common` types, shim, SDK helpers, export maps, and tests.
- Wire `common` into `@napplet/shim` and `@napplet/sdk`.
- Add conformance validator/reference-shell coverage for the new envelopes.
- Update package/docs references and add a changeset for shipped package output.

## Verification

- Focused package builds/type checks for core, nap, shim, sdk, conformance.
- Focused unit tests for the `common` shim and envelope/reference-shell coverage.
- Full repo build, type-check, unit tests, link check, slop scan, and diff check.

## Out of Scope

- No local NIP-19 encode/decode implementation.
- No local follow/reaction/report event construction.
- No new protocol fields or compatibility aliases beyond PR #67.
