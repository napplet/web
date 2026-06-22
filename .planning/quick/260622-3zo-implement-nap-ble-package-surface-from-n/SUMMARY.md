# NAP-BLE Implementation Summary

## Result

Implemented NAP-BLE from `napplet/naps` PR #62 as a new package surface:

- Core BLE protocol/runtime types and `ble` in `NapDomain` / `NAP_DOMAINS`
- `@napplet/nap/ble` barrel, `types`, `shim`, and `sdk` subpaths
- `window.napplet.ble` runtime wiring in `@napplet/shim`
- `ble` namespace and BLE type/helper re-exports in `@napplet/sdk`
- Conformance envelope validators and reference shell responses for `ble.*`
- BLE shim unit coverage
- Docs, package export metadata, JSR metadata, and changeset

Byte payloads use JSON integer arrays (`number[]`) to match NAP-BLE prose and examples.

## Verification

- `node -e "const p=require('./packages/nap/package.json'); console.log(Object.keys(p.exports).length)"` -> `68`
- `rg -n "62 entry|60 entry|58 entry|All 16|all 17 domains|all 16 domains|Theme Exception|14 domains|fourteen|14 optional|twelve NAP|across all 14|all 14|15 Domains|16 Domains" README.md packages apps --glob '!**/CHANGELOG.md' --glob '!**/dist/**'` -> no matches
- `pnpm install --frozen-lockfile`
- `pnpm build` -> 12 turbo build tasks passed
- `pnpm type-check` -> 16 turbo type-check tasks passed
- `pnpm -r test:unit` -> workspace unit tests passed
- Local docs/site link check:
  - served `apps/web/dist` + `apps/docs/.vitepress/dist` at `http://localhost:8099`
  - `node scripts/check-links.mjs http://localhost:8099` -> 18 internal URLs checked, no broken links
- `npx --yes aislop scan -d` -> 98/100, 0 errors, 1 inherited `js-yaml` warning
- `git diff --check`

## Residual Risk

`aislop` still reports the inherited moderate `js-yaml` warning through the package graph. The branch keeps the prior approach of not forcing a `js-yaml` override because the Changesets path uses older YAML APIs; overriding could break release tooling.
