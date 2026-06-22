# Summary

Implemented NAP-LINK from `napplet/naps` PR #53 as shell-mediated, user-visible
navigation exposed through `window.napplet.link.open()` and SDK/`@napplet/nap`
subpaths.

## Shipped Surface

- Added core `link.open` / `link.open.result` envelope and public result types.
- Added `@napplet/nap/link` exports for `types`, `shim`, and `sdk`.
- Mounted `window.napplet.link.open()` in `@napplet/shim`.
- Exported `link.open()` from `@napplet/sdk`.
- Added conformance envelope validation and reference-shell behavior for
  `link.open`.
- Updated package docs, docs app pages, README domain lists, export counts, and
  a changeset.

## Constraints

- The implementation follows NAP-LINK PR #53.
- Opening links is navigation only. The API does not expose fetched bytes,
  opener access, network access, or final browser context control to the napplet.
- Final URL, scheme, prompting, policy, and browser-context decisions remain
  owned by the shell.

## Verification

- `pnpm --filter @napplet/core build`
- `pnpm --filter @napplet/nap build`
- `pnpm --filter @napplet/nap test:unit -- --run src/link/shim.test.ts`
- `pnpm --filter @napplet/core type-check`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/shim type-check`
- `pnpm --filter @napplet/sdk type-check`
- `pnpm --filter @napplet/conformance test:unit -- --run src/validators/envelope.test.ts src/validators/envelope.drift.test.ts src/shell/reference-shell.test.ts`
- `node -e "const p=require('./packages/nap/package.json'); console.log(Object.keys(p.exports).length)"` -> `68`
- Targeted stale-doc scan found no stale fixed-count/domain wording.
- `pnpm install --lockfile-only`
- `pnpm install --frozen-lockfile`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- Local docs link check: `Checked 18 internal URL(s) from http://localhost:8099`;
  `No broken internal links`
- `npx --yes aislop scan -d` -> `98 / 100`, inherited `js-yaml` warning only
- `git diff --check`

## Residual Risk

- Real shell/browser navigation policy, prompts, opener isolation, and final
  browser-context behavior were not exercised locally.
- `aislop` still reports the inherited moderate `js-yaml` advisory; the Vite
  high advisory discovered during this work was resolved with a patch bump.
