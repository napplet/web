# @napplet/nub-storage

## 0.3.0

### Minor Changes

- 2914d72: Convert all 9 `@napplet/nub-<domain>` packages into 1-line re-export shims that forward to `@napplet/nub/<domain>`.

  - Source reduced to a single `index.ts` per package (`export * from '@napplet/nub/<domain>';` with `@deprecated` JSDoc).
  - `package.json` `description` prefixed with `[DEPRECATED]` and names the new `@napplet/nub/<domain>` import path.
  - Runtime dependency switched from `@napplet/core` to `@napplet/nub` (the new package transitively depends on core).
  - README on each package carries a top deprecation banner pointing at `@napplet/nub/<domain>` and flagging removal in a future milestone.
  - `@napplet/nub-config` preserves its optional `json-schema-to-ts` peerDep and `@types/json-schema` devDep — API-surface contracts are unchanged behind the shim.

  Zero behavioral change for pinned consumers — `export *` preserves types, runtime exports, and the `registerNub` side effect (which now lives in `@napplet/nub/<domain>`).

### Patch Changes

- Updated dependencies [066443f]
- Updated dependencies [3d22a10]
- Updated dependencies [60c93a0]
  - @napplet/nub@0.3.0

## 0.2.1

### Patch Changes

- Republish at 0.2.1 to ship resolved workspace dependency versions. The 0.2.0 tarballs on npm contained unresolved `workspace:*` specs in dependencies, breaking installs. This patch bump exists solely to produce correctly-assembled tarballs via `pnpm publish -r` (which rewrites `workspace:*` → concrete versions at pack time).
- Updated dependencies
  - @napplet/core@0.2.1
