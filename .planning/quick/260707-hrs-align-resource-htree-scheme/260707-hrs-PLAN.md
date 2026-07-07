---
quick_id: 260707-hrs
slug: align-resource-htree-scheme
status: complete
date: 2026-07-07
---

# Quick Task 260707-hrs: Align RESOURCE htree Scheme

## Goal

Align the `@napplet/nap/resource` public type/docs surface with the live
NAP-RESOURCE text, which now lists `htree:` as a canonical runtime-fetchable
resource scheme.

## Evidence Inputs

- `napplet/naps` `origin/resource-info`, `naps/NAP-RESOURCE.md`, lists `htree:`
  in the Schemes table and says Hashtree verification is part of the default
  resource policy.
- `@napplet/nap/resource` currently exports `ResourceScheme` as
  `'data' | 'https' | 'blossom' | 'nostr'`.
- Package READMEs, core runtime API comments, SDK helper docs, and the
  build-napplet skill still describe four canonical schemes.

## Tasks

1. Add `htree` to the exported `ResourceScheme` union.
2. Update package comments and shipped docs that enumerate canonical resource
   schemes to include `htree:`.
3. Add a narrow type regression that locks `ResourceScheme = 'htree'`.
4. Add changeset metadata for packages whose shipped type/docs surface changes.
5. Run focused and workspace verification, then open a RESOURCE-specific PR.

## Verification

- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/nap exec vitest run src/resource/types.test.ts src/resource/shim.test.ts`
- `pnpm --filter @napplet/core type-check`
- `pnpm --filter @napplet/sdk type-check`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm check:jsr`
- `npx -y aislop@0.12.0 scan --changes`
- `git diff --check`

## Result

- Added `htree` to the exported `ResourceScheme` union and locked it with a
  type-level regression test.
- Updated shipped comments, READMEs, and the build-napplet skill language that
  enumerated canonical RESOURCE schemes.
- Left runtime handling unchanged: `data:` remains decoded in-shim, while
  `https:`, `blossom:`, `htree:`, and `nostr:` continue to route to the shell.

## Verification Evidence

- `pnpm --filter @napplet/core type-check` passed.
- `pnpm --filter @napplet/nap type-check` passed.
- `pnpm --filter @napplet/sdk type-check` passed.
- `pnpm --filter @napplet/nap exec vitest run src/resource/types.test.ts src/resource/shim.test.ts` passed.
- `pnpm build` passed.
- `pnpm type-check` passed.
- `pnpm -r test:unit` passed.
- `pnpm check:jsr` passed.
- `npx -y aislop@0.12.0 scan --changes` passed at 96/100 Healthy with existing
  warnings for `packages/nap/src/resource/shim.ts` size and the `js-yaml`
  advisory.
- `git diff --check` passed.

## Remaining Risk

Real shell-side `htree:` resolution and Hashtree verification were not exercised
in this package PR; NAP-RESOURCE assigns that behavior to shells, and this change
only aligns the public package type/docs surface.
