---
status: resolved
trigger: Rail Game preview fails importing nostr-tools_pure.js with an outdated optimized dependency URL
created: 2026-10-03
updated: 2026-10-03
---

## Symptoms

The player opens but verification cannot load. The reported dependency URL returns HTTP 504 Outdated Optimize Dep, including in a fresh Chromium context. The active server has run while build/type-check/unit checks executed in the same worktree.

## Current Focus

Confirmed: astro check invokes sync with a different optimizer configuration and replaces the running development server's cache. Command-specific Vite caches resolve the reproduced failure.

## Evidence

- The on-disk optimizer metadata omits nostr-tools/pure despite the running server generating an optimized URL for it.
- A fresh browser reproduces the same failed URL; this is not only stale browser state.
- Restarting dev, running the website type-check before first player launch, then opening the player reliably reproduces HTTP 504. Warming the player before type-check can mask the failure through the running server's memory cache.

## Resolution

Use Astro's config setup hook to select a Vite cache directory per command (dev/build/sync/preview). Extend the development browser check to launch and interact with all three signed previews. No player verification or sandbox behavior changes.

Verification: the failing sequence (fresh dev server, website type-check, first player launch) passes after the fix. Full pnpm build, pnpm type-check, pnpm -r test:unit, and the expanded development browser check pass. Metadata confirms astro-dev retains nostr-tools/pure while astro-sync has its own independent cache. AI-slop scores 84/100 against the configured 70 gate, with no findings in changed files. Existing browser tabs must reload once to discard the failed module import.
