---
status: complete
date: 2026-07-02
quick_id: 260702-820
---

# Implement NAP-COUNT From napplet/naps PR #69

## Result

Implemented the current NAP-COUNT request/result surface as `count.query` and
`count.query.result` across the package set.

## Changed Surfaces

- Added shared core count types and `window.napplet.count.query(...)` typing.
- Added `@napplet/nap/count` types, shim, SDK helper, export maps, build entries,
  and unit coverage.
- Wired `count` into `@napplet/shim`, `@napplet/sdk`, conformance envelope
  validation, and the reference shell.
- Updated package docs and added a changeset for the shipped package surfaces.

## Verification

- `pnpm --filter @napplet/nap test:unit -- src/count/shim.test.ts`
- `pnpm --filter @napplet/conformance test:unit -- src/validators/envelope.test.ts`
- `pnpm --filter @napplet/nap build && pnpm --filter @napplet/shim type-check && pnpm --filter @napplet/sdk type-check && pnpm --filter @napplet/conformance type-check`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- Static-site link check against a local assembled site on port 8099
- `git diff --check`
- `pnpm dlx aislop scan --changes --json .`

## Notes

- The implementation follows the user-confirmed current PR table using
  `count.query`, not the stale `count.count` text still visible in an earlier raw
  PR snapshot.
- Full-repo `aislop scan` still reports pre-existing package-size and per-package
  `vitest` devDependency findings; the changed-file scan is healthy with no
  AI-slop, lint, format, security, or error diagnostics.
