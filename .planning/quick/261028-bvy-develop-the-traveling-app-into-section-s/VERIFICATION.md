# Acceptance evidence

Current local verification for the expanded showcase. Hosted checks are recorded after pushing; no production deployment is implied by an open PR.

| Requirement | Evidence |
| --- | --- |
| Preserve a common theme and runnable apps | Shared aubergine palette retained; original three previews still load, accept input, close, restore focus and retry. New three also start gameplay in the production-artifact browser check. |
| Replace the rejected generic image and edge motion | `AppWindow.astro`, `Journey.astro`, `animations.ts`: recognizable actual app moves between six section anchors; no edge rail. Social artwork regenerated. Desktop scene screenshots inspected. |
| Section reveals incorporate the app | Collection fans around it; desktop/phone masks reveal its new hosts; capability paths draw from it; builder view morphs its interface into an untitled canvas. Scroll-linked timelines reverse and honor reduced motion. |
| Expanded shells and platforms | Six configured entries include Myco, Amethyst, noStrudel, Grimoire, napplet.soy and Paja, with platform/status labels and project sources. See RESEARCH.md for primary evidence. |
| More configurable napplets | Six curated previews in `src/data/apps.json`, six shells in `shells.json`, discovery settings in `discovery.json`; README documents adding entries without component edits. Original signatures/bytes and new source-license notices verified. |
| App store with curated and discovered apps | `/apps/` renders six curated selections and 37 signed discovered releases offline. Search, collection filters, zero results, copy actions and explicit live discovery. Real live pass reached 62 entries. |
| Current protocol | Actual current NIP-5D file read; own manifest kinds and direct artifact hashes used for discovery. Historical adapter isolated. Full upstream NAP refresh 44 entries at `5aadf1b`. Source metadata defects disclosed. |
| Functional verification | `check-showcase.mjs`, `check-app-store.mjs`, `check-protocol-browser.mjs` exercise the production artifact. The store test covers six launches, new gameplay, signature rejection, malicious plain-text metadata, deduplication, no relay contact before click, offline retry, mobile and no-JavaScript. |
| Responsive/accessibility | Browser screenshots and no overflow at 1440, 390 and 320; no-JavaScript links and content; reduced-motion cleanup; reverse scrolling and resize. axe-core 4.10.3 WCAG 2 A/AA + 2.1 A/AA: zero violations on both routes at 1440/390/320. This is measured coverage, not universal certification. |
| Build/types/units | Exact `pnpm build` 12/12, `pnpm type-check` 19/19 and `pnpm -r test:unit` pass after integrating main. Final web unit suite has 20 passing cases. |
| Deployment assembly/links | Conformance built with `/conformance/` base; assembly tests pass; exact assembled artifact crawled: 74 internal URLs, zero broken links. All 44 protocol detail routes/canonicals/sitemap verified. |
| AI-slop gate | Pinned 0.12.0 changed-branch scan 98/100; zero source diagnostics. One low-severity deepmerge dependency advisory reports no available fix. Existing threshold 70 retained; no rule changes. |

## Observed failures and corrections

A parallel build and type-check rerun raced on tsup's clean output directory and raised ENOENT. Type-check has build dependencies, so final checks ran sequentially; full build passes. No source workaround was added.

The stronger mid-page resize/deep-link test exposed asynchronous browser anchor scrolling and refresh timing, plus a destination ordering issue in the host markup. Anchors are now sorted by document position, and phone reveal uses a mask so it cannot change the anchor geometry. The test waits for sustained alignment rather than taking a transient sample. Final result is recorded with hosted status below.

The first hosted run failed before compilation because setup-node selected 22.23.3 while installed Astro declares >=22.23.4. Updated the five jobs building the complete workspace (CI, conformance, link check, site deploy, npm publish) to Node 24 LTS. Package-only JSR and quality jobs retain their existing runtime. Hosted rerun evidence follows.

Local headless scrolling smoke: 163 frame samples, median 8.3 ms, p95 9.2 ms, zero samples above 50 ms. This observation is not a device-independent performance guarantee.

## Hosted source checkpoint

At f0a27e65, [CI](https://github.com/napplet/web/actions/runs/40655171435), [conformance](https://github.com/napplet/web/actions/runs/40655171558), and [quality](https://github.com/napplet/web/actions/runs/40655171482) pass. The [site-link job](https://github.com/napplet/web/actions/runs/40655171414) is still building when this record is committed. The PR check panel supplies its eventual result. The immediately preceding Node-24 integration c8eaf7a0 passed all four hosted checks.

Final homepage selections are all current direct-hash releases, with Freeze Frame Response as the traveling app. The current homepage and store browser checks pass after that selection change. The directory contains six public shells, all checked through unauthenticated HTTP. An additional private-only candidate was removed.

Integrated main commit 49fc04dc (PR #270, NAPP porting skill/docs) after it landed during hosted validation. Resolved only the shared planning-state conflict by preserving both quick-task rows. No showcase source or release bytes changed in that merge.
