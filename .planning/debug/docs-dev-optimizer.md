---
status: resolved
trigger: pnpm dev:site fails with 506 esbuild destructuring transform errors
created: 2026-10-03
updated: 2026-10-03
---

## Symptoms

Expected: Astro and VitePress remain running for a local preview. Actual: VitePress dependency optimization fails under Node 26.7.0 with esbuild 0.28.1, causing Turbo to stop both servers. Reproduced with `pnpm --filter @napplet/docs dev` on the showcase branch.

## Current Focus

Confirmed: VitePress dependency optimization uses legacy Vite targets independently of the existing build and transform targets. Both development servers now remain running and browser interaction succeeds.

## Evidence

- The existing VitePress config sets build.target and esbuild.target to esnext, but omits optimizeDeps.esbuildOptions.target.
- The failure explicitly reports chrome87, edge88, es2020, firefox78, safari14, proving optimization does not use the configured build target.

## Resolution

Set optimizeDeps.esbuildOptions.target to esnext, matching the existing docs build target. Browser verification additionally exposed an Astro proxy failure: /docs/@vite/client returned Astro's 404, and docs remained blank. Development-only /docs navigation now redirects to the VitePress origin, where module loading and hot reload work normally. Production paths are unchanged.

Added scripts/check-site-dev.mjs to verify actual rendered homepage/docs content and interactive docs search. Full build, type-check, and workspace unit tests passed after the optimizer fix; browser verification passed for homepage, docs home, getting-started, and 16 search results without page errors.

After the redirect and regression check, full build and type-check passed again, as did the new browser check. AI-slop scored 84/100 against the configured 70 threshold, with no findings in changed files (two existing complexity warnings and the two existing dependency advisories).
