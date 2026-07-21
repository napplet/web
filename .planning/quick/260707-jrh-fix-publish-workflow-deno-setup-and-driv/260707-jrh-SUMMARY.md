---
phase: quick-260707-jrh
summary: 01
status: release-fix
completed_at: null
---

# Summary: Fix Publish workflow Deno setup and drive pending changeset release

## Result

The root cause is identified and patched locally. PR #140 did not create a
Version Packages PR because the `Publish` workflow failed before
`changesets/action` could run: the workflow executed the root `pnpm build`,
which includes `@napplet/cli`, but the runner had not installed Deno.

## Fix

- Added `denoland/setup-deno@v2` to `.github/workflows/publish.yml` before
  `pnpm install --frozen-lockfile` and `pnpm build`.
- Kept the fix narrow: no package, changeset, or release-script behavior changed.

## Verification

- Parsed `.github/workflows/publish.yml` with Ruby YAML.
- Confirmed local Deno availability with `deno --version`.
- Ran `git diff --check`.
- Ran `pnpm build`.
- Ran `pnpm type-check`.
- Ran `pnpm -r test:unit`.
- Ran `pnpm dlx aislop@0.12.0 scan --json .`.

## Remaining Release Work

1. Push and merge this workflow-fix PR.
2. Confirm the next `Publish` run reaches `changesets/action` and creates or
   updates the Version Packages PR.
3. Merge the Version Packages PR after checks pass.
4. Verify the resulting npm/JSR registry state for the released packages.
