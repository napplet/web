---
status: complete
created: 2026-07-06
---

# Fix JSR Publish Failure For @napplet/shim

Failure: GitHub Actions run `28811670437` failed in `publish-jsr` because
`packages/shim/jsr.json` exports `./prelude.global` as `./src/prelude.global.ts`,
but that source file does not exist.

## Plan

1. Confirm the failing workflow log and source/export mismatch.
2. Remove the JSR-only `./prelude.global` export, keeping the npm `package.json`
   export that points at generated `dist/prelude.global.js`.
3. Add a regression test that every `jsr.json` export points at an included source file.
4. Run focused shim checks, workspace checks, and a local JSR dry-run for
   `packages/shim`.
5. Commit, push, and open a PR.

## Acceptance

- `packages/shim` can pass `npx jsr publish --dry-run --allow-slow-types --allow-dirty`.
- Tests fail if a future `jsr.json` export points at a missing source file.
- npm/browser `@napplet/shim/prelude.global` remains unchanged in `package.json`.
