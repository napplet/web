---
status: complete
---
# Quick 261103-rsl summary

Replaced 64 references in 40 files, plus 4 test assertions. Confirmed `napplet/web` has the `napplet-cli` release the installers download from.

Verification: `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, CLI `deno test` (260 passed), `test:installers`, `test:skills-contracts` (11), `test:agent-output` (14) all green; aislop at baseline (deepmerge warning only). `test:onboarding-contracts` fails identically on `main` (stale `npx @napplet/boilerplate` in the docs build); not touched here.
