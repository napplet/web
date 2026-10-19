# Verification — website and communications

Status: passed. Local verification and all four hosted checks passed for implementation revision c0f588eb.

## Goal evidence

| Requirement | Evidence | Assessment |
| --- | --- | --- |
| Use existing website PR as base | Continued #221 and `feat/astro-ecosystem-showcase`; merged current main 6a03462b in 8a67cfaf | Passed |
| Research before final copy | RESEARCH.md records current NIP-5D source/head, NAP registry, real releases and live relay query, editorial precedents, six-audience journey mapping, protocol discrepancy and resolution | Passed; qualitative editorial research, not audience interviews |
| Broad developer appeal | Hero leads with web apps and portability; explanation follows real demos; no network expertise assumed in entry links | Passed in copy review |
| Six audiences and overlap | Expert Docs/Protocol shortcuts; curious visitor's real examples and explanation; manual/agent app routes; shell toolkit; service contracts/contribution; tool package index | Passed |
| At most one network mention below fold | Exactly one visible homepage occurrence; automated checks at 1440/390/320; separate range/layout audit proves explanation below initial viewport | Passed |
| Preserve technical material elsewhere | `/explainer/`, `/docs/`, `/protocol/` remain separate routes; protocol source/status links intact | Passed |
| Showcase apps and shells | Three original playable archived apps; two actual shells with screenshots and source links; live shell endpoints returned 200 | Passed |
| Protocol fidelity | Obsolete NIP-5A homepage layer removed; archival adapter explicitly isolated from current-protocol validation; original signatures untouched; no aggregate-based runtime identity map | Passed with historical-preview disclosure |
| Minimalist palette and composition | Inspected desktop/mobile screenshots: aubergine palette, large sparse typography, plain rules in place of repeated boxed panels; no ornamental grid/neon/glitch effects | Passed by visual review; aesthetic quality remains judgment |
| Persistent design element | One app glyph leaves hero, docks in chapter rail, becomes hosted/connected/unfinished with section changes | Passed in browser, including reverse scroll |
| Intentional GSAP reveals | App image scale, shell arrival, contract rows and builder indices have distinct sequences | Passed in motion smoke checks |
| Responsive and accessible | No horizontal overflow at 1440/390/320; keyboard modal focus restored; no-JS links/content; reduced-motion cleanup; dynamic resize; axe WCAG A/AA audit zero violations at all three widths | Passed within tested scope |
| Communications consistency | Headline, document metadata, footer and regenerated 1200×630 social card agree; image manually inspected | Passed |
| Original unrelated work preserved | All changes confined to showcase worktree; original CLI WIP untouched | Passed |

## Commands and current evidence

- `pnpm build`: 12/12 successful after main integration.
- `pnpm type-check`: 18/18 successful after main integration.
- `pnpm -r test:unit`: exit 0 after main integration.
- `pnpm test`: exit 0, including tutorial checks; final tutorial conformance 5 pass, 0 fail, 6 expected skips for unused/unmeasured features.
- `pnpm test:protocol`: 9 tests pass; assembly unit checks pass.
- Conformance web built with `/conformance/` base; `scripts/assemble-site.mjs` succeeds.
- `node scripts/check-showcase.mjs http://127.0.0.1:8108`: all layouts, archived apps, failure/retry, focus, no-JS, metadata, chapter travel and reduced-motion switching pass against merged static artifact.
- `node scripts/check-links.mjs http://127.0.0.1:8108`: 67 internal URLs, no broken links.
- Temporary axe/resize audit: `/tmp/audit-home.mjs`; output `/tmp/rethink-accessibility.log`, zero WCAG A/AA violations at three viewport widths. Additional glyph return/cleanup checks: `/tmp/check-traveler.mjs`.
- AI-slop 0.12.0: 92/100 after main's security overrides; source engines report zero findings; unchanged gate is 70. Remaining advisories: http-cache-semantics (high, no fix reported), fflate (moderate, patch available). No gate weakened.
- `git diff --check`: passes.

## Limits and outstanding work

Protocol refresh completed on 2026-10-19 using the generator with authenticated API metadata and exact Git object blobs from upstream commit `19de5ce1cea40cd4c76089cdd8126e9f87648049`. This avoids the local GitHub blob-API connection resets without changing sources or weakening revision checks. All 44 entries were built and checked: directory/filter/detail/contribution behavior at 1440/390/320 and no-JS passed. A final link crawl against the rebuilt artifact passed 73 internal URLs. An earlier crawl overlapped artifact replacement and saw an obsolete route; it is not used as final evidence.

Hosted checks passed on implementation revision `c0f588eb2b315cfa6e322a3c5395430666449234`:

- [CI: build, type checks and tests](https://github.com/napplet/web/actions/runs/39286991384) — success.
- [Conformance](https://github.com/napplet/web/actions/runs/39286991429) — success.
- [Assembled-site links and browser verification](https://github.com/napplet/web/actions/runs/39286991629) — success.
- [AI-slop scan](https://github.com/napplet/web/actions/runs/39286991402) — success, 97/100 on the hosted runner. Local and hosted dependency resolution/reporting produced different scores; both clear the unchanged 70-point threshold.

PR #221 is mergeable. The final bookkeeping commit changes only `.planning/` artifacts, so the tested application, dependencies, scripts, workflows and generated protocol snapshot are unchanged. No production deployment or PR merge is claimed; the authorized deliverable is the ready-to-review PR.
