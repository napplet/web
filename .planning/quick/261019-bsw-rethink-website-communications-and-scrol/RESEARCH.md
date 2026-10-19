# Research journal — website rethink

Non-normative. Observations dated 2026-10-19. These notes guide this website implementation; the living protocol sources govern interoperability.

## Verified foundation and defects

[PR #221](https://github.com/napplet/web/pull/221) has head df379da5. Its newer commit includes the generated protocol directory, daily source refresh and a shortened two-path Develop section. The local worktree initially lagged behind this commit and is now aligned. Existing screenshots and green-check claims in the old SUMMARY are historical, not evidence for this redesign.

Read the actual `5D.md` at current [NIP-5D PR](https://github.com/nostr-protocol/nips/pull/2303) head 5560820fa4f37f45b8ab742a11aeb3001b17dc67 using GitHub's contents API. The proposal remains open. Its Identity and Manifest sections specify the artifact hash in a single x tag. The homepage's “built on NIP-5A” layer and player verifier's aggregate-hash behavior are stale. `apps/web/src/lib/player/verify.ts` derives an aggregate from a path and validates x against it; its tests and controller identity repeat that model. These are defects to fix or explicitly retire, not requirements to preserve. Do not edit signed cached manifests to manufacture compatibility.

[NAP registry](https://github.com/napplet/naps) remains the destination for capability contracts. Generated copies are reference views, not a local authority. Keep source and status links prominent.

## Audience / information architecture

| Audience | Immediate question | Homepage evidence | Useful next action |
| --- | --- | --- | --- |
| Expert ecosystem developer | Where are the contracts and code? | Persistent Docs and Protocol navigation | Protocol directory, SDK, runtime |
| Curious web developer | What is this, concretely? | Actual playable apps, then a short definition | Try app; how it works |
| App builder | Can I use my existing skills? | Web technologies, agent or manual route | Tutorial and agent skills |
| Shell builder | Can this fit my host? | Real shells and capability-dependent portability | Runtime integration docs |
| Service builder | How does my service reach apps? | Services supplied through shells | Existing capability contracts and service integration |
| Tool builder | What can I build around this? | Publishing, discovery and testing workflows | CLI/package docs and open specifications |

This is a task-based navigation design, not a measured audience study. Avoid six marketing personas on screen. Four explicit build paths plus an explanatory reading path and expert shortcuts cover the overlap.

## Editorial precedents and implications

[Ink & Switch](https://www.inkandswitch.com/) places an interactive artifact before its research taxonomy and links concrete named projects. Design inference: let visitors encounter actual software before the architecture. Borrow this evidence-first ordering, not its visual identity.

[Local-first software](https://www.inkandswitch.com/essay/local-first/) is useful as a distinction between desired user agency and implementation claims. Editorial inference: express portability through what the app and shell do; do not borrow offline, ownership, privacy or universal availability guarantees that the napplet contract does not establish.

[napplet.soy](https://napplet.soy/) is a real discovery/play destination, with a playful identity of its own. The protocol website should showcase that variety without making the entire ecosystem seem exclusively about tiny games. Existing selections include a creative coding tool as well as two games; investigate more representative current releases before expanding the collection.

The existing Kehto web destination returned a browser research-tool error. That does not establish an outage. Re-check via HTTP and source before updating any shell link or brand.

## Motion design direction

[GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) supports responsive motion setup and cleanup. Read the installed gsap-scrolltrigger skill. Use one persistent app frame whose changing context explains portability; section-specific timelines reveal hosting, capabilities, and building. Keep all copy readable in static HTML and reduced motion. No scroll hijacking or arbitrary long pinning. Verify resize, reverse scrolling and direct anchor navigation in the browser.

## Research still required

- Current signed app releases and source/license continuity; current shell names, links and compatibility caveats.
- Rendered baseline and design iteration at multiple widths, not source inspection alone.
- Verify actual onboarding/service/tool destinations against the code and docs shipped in this branch.
- Finish copy review, communications metadata/social image consistency and runtime behavior evidence.

## First implementation checkpoint

The updated homepage removes the obsolete NIP-5A layer, uses “Apps that travel” as its opening, places the single network mention in the shell explanation, and supplies four task-based builder paths. Browser screenshots inspected at 1440 and 390 pixels show a quieter visual hierarchy, actual app screenshots, restrained surfaces, and readable stacked mobile sections. The persistent frame currently works as a chapter rail; further refinement is needed to make it carry the app/host relationship more visibly through the journey.

A live WebSocket query to `wss://relay.napplet.soy` for the three selected author/d-tag addresses returned the same legacy manifests: path-based artifact selection, aggregate x tags, and empty descriptions in event content. This is evidence of a downstream compatibility issue, not permission to rewrite signatures or claim current conformance. Player migration remains unresolved.

Validation for this checkpoint: web build and web type-check pass after syncing the lockfile dependencies. Updated `scripts/check-showcase.mjs` passes against the built static site on port 8107 at 1440×900, 390×844 and 320×568, including playable apps, close/focus/retry, one visible network mention, all four builder paths, no-JS, metadata and motion smoke checks. These checks do not establish current-protocol conformance or final visual quality. The first attempt against Astro dev included toolbar headings; the authoritative test runs against static output.

Full `pnpm build` passes (12 tasks), and `pnpm type-check` passes (17 tasks). Website unit tests pass (11). AI-slop 0.12.0 changed-file scan scores 73/100 with four dependency advisories and one warning; no source findings. Its command exits 1; the existing workflow uses a 70-point score threshold. Dependency remediation and the final unchanged-policy gate remain to be evaluated before shipping. Full recursive unit run is tracked by exec session 42224 with output `/tmp/rethink-full-unit.log`. Static preview is served at port 8107 (session 29778); Astro development preview is on port 5176.
