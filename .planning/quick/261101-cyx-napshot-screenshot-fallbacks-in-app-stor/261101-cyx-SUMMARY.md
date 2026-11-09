---
quick_id: 261101-cyx
slug: napshot-screenshot-fallbacks-in-app-stor
date: 2026-11-01
status: complete
---

# Summary: Napshot screenshot fallbacks in the app store

- `apps/web/src/lib/napshot.ts` verifies trusted Napshot labels (NIP-32 kind 1985, `#screenshot`) against the exact manifest revision, parses `screenshot` tags strictly, enforces mirror URL policy, and selects deterministically. Root and named releases only; author screenshots and publisher listing art take precedence.
- `media.ts` adds a timeout, a streamed size limit, URL and redirect policy checks, exact byte-length and decoded-dimension checks, base-path-preserving mirror URLs, and object URL revocation on page disposal.
- Wiring: `card.ts` (`data-media.napshot`), `store.ts` (hydration, live `#e` label query from trusted signers, cleanup), `apps.astro` (static selection and copy), `discovery.json` (`screenshotLabelers`), and `refresh-showcase-apps.mjs` (saves `labels`).
- Refreshed snapshot: 644 manifests, 117 listings, 6 trusted labels. 5 releases carry a valid preview; 2 render it (SeedHammer 3D viewer, Conway's Game of Life), and 3 keep their publisher listing art.
- Verification: web unit tests 42/42, including 12 new Napshot cases; `pnpm build`, `pnpm type-check` and `pnpm -r test:unit` green; `check-app-store.mjs` passes with routed mirrors. A mutation test (signer check removed) failed the untrusted-label assertion as expected. Slop gate 98/100 (pre-existing deepmerge advisory only).
- Issue filed upstream: napplet/napshot#4 (no backfill for napplets published before the first scan).
- Proof images are in `proof/`.
