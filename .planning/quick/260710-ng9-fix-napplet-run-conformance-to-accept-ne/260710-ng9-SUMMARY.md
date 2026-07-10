---
status: complete
completed: 2026-07-10
commit: 04606c3a
mode: quick
---

# Quick Task 260710-ng9 Summary

## Outcome

`napplet.run/conformance` now accepts NIP-19 `nevent` and `naddr` targets for
NIP-5D napplet manifest events. HTTP URLs remain available only as a local
development fallback, including legacy `?url=...` links.

## Changes

- Added a conformance-web target resolver for `nevent` and `naddr` pointers.
- Resolve manifest events from pointer relay hints, verify event signatures,
  validate NIP-5D manifest event shape, verify optional aggregate `x` tags,
  fetch `/index.html` from Blossom `server` hints, and verify the blob hash.
- Updated the web UI copy, input type, and deep-link parameter to `?target=...`.
- Replaced private HTML manifest meta checks in `@napplet/conformance` with
  checks against resolved NIP-5D manifest events.
- Kept `validateManifest(html)` as an HTML-only compatibility wrapper and added
  `validateManifestEvent(event)` plus napplet manifest kind exports.
- Updated conformance package/web docs and added a changeset for the changed
  package behavior.

## Verification

- `pnpm --filter @napplet/conformance test:unit`
- `pnpm --filter @napplet/conformance build`
- `pnpm --filter @napplet/conformance-web test:unit`
- `pnpm --filter @napplet/conformance type-check`
- `pnpm --filter @napplet/conformance-web type-check`
- `pnpm --filter @napplet/conformance-web build`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm lint`
- `pnpm test`
- `pnpm --filter @napplet/conformance-e2e test:e2e`
- `git diff --check`
- `pnpm dlx aislop scan --json .`

`aislop` exited successfully but reported 88/100 from pre-existing large-file and
long-function warnings outside this change set. No findings were reported in the
touched files.

## Residual Risk

- Live browser verification against a real published napplet pointer was not run
  because no current pointer was supplied in the task.
- Broader tutorial and vite-plugin documentation may still mention legacy
  `napplet-*` HTML metadata. This change updated the conformance-facing docs and
  package behavior only.

## CI Follow-up

PR #160 initially failed the `Conformance / conformance` check because the e2e
harness still expected local directory JSON reports to include `napplet` from the
legacy HTML `napplet-type` meta tag. The e2e expectation now asserts the new
truth boundary: local fixture mode has no signed manifest event, so manifest
identity checks skip and JSON omits `napplet`.
