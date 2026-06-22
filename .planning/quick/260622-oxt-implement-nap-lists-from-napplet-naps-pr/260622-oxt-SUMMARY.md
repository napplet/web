---
id: 260622-oxt
description: implement NAP-LISTS from napplet/naps PR #68
status: complete
completed: 2026-06-22
commit: 891af42
---

# Quick Task 260622-oxt Summary

Implemented the draft NAP-LISTS package surface from napplet/naps PR #68.

## Delivered

- Added `lists` to `@napplet/core` domains and global/runtime service types.
- Added `@napplet/nap/lists` with message types, shim request handling, SDK helpers, package exports, tsup entries, and unit coverage.
- Mounted `window.napplet.lists` from `@napplet/shim`.
- Re-exported `lists` from `@napplet/sdk`, with the service wrappers split out of `cvm.ts` to keep the SDK surface below the slop file-size threshold.
- Extended conformance envelope validation and the reference shell for `lists.supported`, `lists.add`, and `lists.remove`.
- Updated package/docs references and added changesets for shipped packages.

## Verification

- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `git diff --check`
- `npx --yes aislop scan -d`
- Stale-doc string scan for prior active-domain/export counts

## Remaining Risk

- The slop scan still reports a pre-existing `js-yaml` moderate advisory in `package.json`.
- Real list lookup, encryption, signing, and publish behavior remains shell/runtime responsibility and is not implemented in this SDK package surface.
