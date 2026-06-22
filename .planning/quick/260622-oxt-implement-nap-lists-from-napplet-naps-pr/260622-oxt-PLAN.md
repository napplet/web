---
id: 260622-oxt
description: implement NAP-LISTS from napplet/naps PR #68
status: complete
created: 2026-06-22
---

# Quick Task 260622-oxt: Implement NAP-LISTS

## Scope

Implement the draft NAP-LISTS package surface from
https://github.com/napplet/naps/pull/68 in this SDK monorepo.

## Must Haves

- Add a `lists` NAP domain under `@napplet/nap` that exposes the three PR #68
  operations only: `lists.supported`, `lists.add`, and `lists.remove`.
- Provide TypeScript message, SDK, and shim/global types matching the existing
  NAP package patterns.
- Register package exports and docs so consumers can import
  `@napplet/nap/lists` and related subpaths.
- Do not embed a local NIP-51 list-kind table or mutation logic; PR #68 makes
  kind/type mapping, private item encryption, event preservation, signing, and
  publishing runtime-owned.
- Add focused tests for request/result wiring and exported surface.
- Add release metadata only for packages whose shipped output changes.

## Tasks

1. Map existing NAP module conventions and add the `lists` source files.
   Verify with package-level unit tests and type-check.

2. Wire exports, documentation, and changeset metadata.
   Verify consumers can resolve the new subpath exports.

3. Run repo gates (`pnpm build`, `pnpm type-check`, `pnpm -r test:unit`,
   slop/static gates where available), then commit and open the PR.

## Result

Complete in commit `891af42`.
