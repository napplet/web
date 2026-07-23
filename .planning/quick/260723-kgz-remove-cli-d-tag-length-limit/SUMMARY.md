---
id: 260723-kgz
slug: remove-cli-d-tag-length-limit
date: 2026-07-23
status: complete
commit: 5d798639
branch: fix/cli-d-tag-length-limit
pr: https://github.com/napplet/web/pull/184
---

# Summary

Relaxed `NAMED_SITE_D_TAG_PATTERN` in `@napplet/cli` from `^[a-z0-9-]{1,13}$` to
`^[a-z0-9-]+$`. The 13-character upper bound was CLI-invented protocol surface —
neither NIP-5D nor NIP-5A constrains `d` tag length — and it hard-failed
spec-conformant napplets (`napplet deploy --all` threw on any workspace folder
name longer than 13 characters).

## Changed

- `packages/cli/src/manifest.ts` — pattern + thrown error message
- `packages/cli/src/deploy-plan.ts` — `assertFolderDTag` error message
- `packages/cli/src/init-wizard.ts` — wizard validation message
- `packages/cli/README.md` (2 occurrences) — documented pattern
- `packages/cli/tests/manifest_test.ts` — regression test for a 25-char `d` tag
- `.changeset/cli-d-tag-length-limit.md` — `@napplet/cli` patch

## Kept deliberately

Charset `[a-z0-9-]` and the "must not end with `-`" check — these encode the
CLI's own folder-name ⇄ `d` tag normalization contract, not a protocol claim.

## Verification

- `pnpm build` — 13/13
- `pnpm type-check` — 17/17
- `pnpm -r test:unit` — green
- `deno task test:unit` (packages/cli) — 115 passed, 0 failed

## Notes

- Archived `.planning/` milestone artifacts still quote the old pattern as
  historical context; non-normative, left untouched.
- AGENTS.md references an `.aislop/config.yml` gate that does not exist in the
  repo — step skipped.
