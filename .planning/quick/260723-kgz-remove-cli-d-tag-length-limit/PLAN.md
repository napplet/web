---
id: 260723-kgz
slug: remove-cli-d-tag-length-limit
date: 2026-07-23
mode: quick
---

# Remove the 13-character `d` tag length cap in `@napplet/cli`

## Problem

`packages/cli/src/manifest.ts` defines:

```ts
export const NAMED_SITE_D_TAG_PATTERN = /^[a-z0-9-]{1,13}$/;
```

The upper bound of 13 characters is **invented protocol surface** — neither NIP-5D
nor NIP-5A constrains the length of a NIP-5A `d` tag. Per AGENTS.md rule 1/4, a
build/validation hard error that rejects a spec-conformant napplet is a defect.
The CLI currently refuses to deploy any named napplet whose `d` tag exceeds 13
characters, and `napplet deploy --all` throws on any workspace folder with a
longer name.

## Change

Relax the pattern to `^[a-z0-9-]+$` — drop the length cap, keep the charset.

Retained (out of scope, unchanged):
- charset `[a-z0-9-]` — the CLI's own normalization contract for folder-name ⇄
  `d` tag mapping
- the "must not end with `-`" rule — a separate explicit check, not part of the
  length cap

## Files

| File | Change |
|---|---|
| `packages/cli/src/manifest.ts` | pattern + thrown error message |
| `packages/cli/src/deploy-plan.ts` | `assertFolderDTag` error message |
| `packages/cli/src/init-wizard.ts` | wizard validation message |
| `packages/cli/README.md` (×2) | documented pattern |
| `.changeset/*` | patch bump for `@napplet/cli` |

No tests assert the 13-char limit (`grep` over `packages/cli/tests/` — clean).
Add a regression test that a >13-char `d` tag is accepted.

## Verification

- `pnpm build`, `pnpm type-check`, `pnpm -r test:unit` green
- `grep -rn "1,13"` returns no hits outside `dist/` and `CHANGELOG.md`
