# NAP-SERIAL implementation summary

## Outcome

Implemented the package surface for NAP-SERIAL from `napplet/naps` PR #61 as a
single implementation slice.

## Changed

- Added serial core types and global `window.napplet.serial` API typing.
- Added `@napplet/nap/serial` types, shim, SDK wrappers, barrel exports, package
  exports, and unit coverage.
- Wired the root shim and SDK runtime exports to expose serial open/write/close
  and pushed serial events.
- Extended conformance envelope coverage and reference-shell responses for
  `serial.open`, `serial.write`, `serial.close`, and `serial.event`.
- Updated package/docs references and added a changeset for the shipped package
  surfaces.
- Updated Vite to `6.4.3` across workspace consumers to clear the slop gate's
  high-severity advisory.

## Verification

- `pnpm build`
- `pnpm install --frozen-lockfile`
- `pnpm type-check`
- `pnpm -r test:unit`
- `node scripts/check-links.mjs http://localhost:8099`
- `git diff --check`
- `npx --yes aislop scan -d`

## Residual Risk

- No real serial hardware/runtime backend was exercised; this PR covers the typed
  package API, shim dispatch behavior, conformance envelopes, and docs.
- The slop scan remains at `98 / 100` because `@changesets/cli` pulls
  `read-yaml-file@1.1.0`, which depends on `js-yaml@3.14.2`. `read-yaml-file@1`
  calls `safeLoad`, so forcing `js-yaml` v4 would break Changesets.
