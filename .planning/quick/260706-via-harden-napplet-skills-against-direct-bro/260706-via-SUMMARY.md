# Quick Task 260706-via Summary

## Status

Complete in commit `e781e436`.

## Delivered

- Hardened `make-napplet`, `design-napplet`, `build-napplet`, `port-napplet`, and `test-napplet` so the sandbox authority contract appears before implementation guidance.
- Documented that napplets must not use direct browser authority such as `fetch`, XHR, WebSocket, browser storage, cookies, external scripts, external stylesheets, or external media loads.
- Routed ROMs, WASM, images, media, fonts, JSON, persistence, social Nostr operations, and external links through bundled single-file bytes or explicit NAP domains.
- Removed `fetch(data:)` from the `@napplet/nap/resource` data URL fallback so official helper code does not contradict the skill guidance.
- Extended conformance static scanning to flag direct browser authority surfaces in served napplet sources.

## Verification Evidence

- `pnpm --filter @napplet/nap test:unit -- --runInBand`
- `pnpm --filter @napplet/conformance-cli test:unit -- --runInBand`
- `pnpm --filter @napplet/skills test:unit -- --runInBand`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/conformance-cli type-check`
- `pnpm --filter @napplet/conformance type-check`
- `pnpm --filter @napplet/skills type-check`
- `pnpm --filter @napplet/conformance test:unit -- --runInBand`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm check:jsr`
- `node scripts/check-links.mjs http://localhost:8099` against locally served assembled `site/`
- `npx -y aislop@0.12.0 scan --changes`
- `git diff --check`

## Residual Risk

- No fresh one-shot agent benchmark was run after the skill changes.
- `aislop` remained healthy at 96/100 with residual warnings for a large existing file and a `js-yaml` advisory.
