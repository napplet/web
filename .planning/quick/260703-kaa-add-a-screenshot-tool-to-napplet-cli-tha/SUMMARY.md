---
quick_id: 260703-kaa
slug: add-a-screenshot-tool-to-napplet-cli-tha
status: complete
completed: "2026-07-03T12:48:51Z"
---

# Summary

Added `napplet screenshot` for `@napplet/cli`.

## Delivered

- New screenshot command that discovers napplets from `.napplet/config.json`, starts a loopback static target when `--target-url` is omitted, launches `kehto paja` with fixed identity mode, waits for Paja iframe readiness, captures only `#napplet-frame` through Chrome DevTools Protocol, and writes a PNG under the deploy directory.
- Default identity is `npub1uac67zc9er54ln0kl6e4qp2y6ta3enfcg7ywnayshvlw9r5w6ehsqq99rx`; `--identity <npub|hex>` overrides it.
- Default screenshot directory is `screenshots/`; `--out-dir` is constrained to remain relative to the deploy directory so `napplet deploy` discovers generated PNGs.
- Deploy inclusion is via existing NIP-5A-style `path` tags: screenshot files under the deploy root are hashed, uploaded to Blossom, and included in manifest events without inventing a screenshot tag.
- Fixed single-repo `dist/index.html` discovery naming from `..` to `root`, which prevents hidden screenshot filenames like `...png`.
- Updated CLI docs, exports, and changeset.
- Updated the publish-script test that was stale on `feat/napplet-cli` after `@napplet/cli` moved to JSR-only publishing.

## Verification

- `deno lint src tests`
- `deno task check`
- `deno task test:unit`
- Live smoke: temp built napplet loaded through Paja with `/usr/bin/chromium`, wrote `dist/screenshots/root.png` (12258 bytes), and `napplet deploy --dry-run --name smoke` emitted `/screenshots/root.png` in manifest path tags.
- `pnpm --filter @napplet/cli build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm build`
- `git diff --check`
- `pnpm dlx aislop@0.12.0 scan --json .` -> score 89 / Healthy, 0 errors, 0 fixable; remaining warnings are existing large-file/js-yaml advisories.

## Remaining Notes

- Local `/home/sandwich/.local/bin/kehto` exits without dispatching because its direct-cli check expects a path ending in `/index.js`; live smoke used `/home/sandwich/Develop/kehto/packages/cli/dist/index.js` via `paja.command`. That is a Kehto packaging issue, not a `@napplet/cli` code path failure.
