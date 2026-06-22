# NAP-LINK Quick Plan

## Source

Canonical contract: `napplet/naps` PR #53 (`NAP-LINK: add shell-mediated link opening`).

## Scope

- Add `link` to core NAP domain constants and global runtime types.
- Add `@napplet/nap/link` barrel, `types`, `shim`, and `sdk` subpaths.
- Mount `window.napplet.link` from `@napplet/shim`.
- Re-export LINK helpers/types from `@napplet/sdk`.
- Add conformance envelope validator entries and reference shell response.
- Add focused shim tests.
- Update package/docs metadata and changesets.
- Run full verification and open a PR.

## Protocol Notes

- NAP-LINK is user-visible navigation only, not resource fetching.
- The napplet API is `open(url, options?)`.
- `url` is a string; shell policy validates the final destination and scheme.
- The shell must not expose opener authority, network access, or fetched bytes.

## Verification

- `pnpm install --frozen-lockfile`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- local docs/site link check
- `npx --yes aislop scan -d`
- `git diff --check`
