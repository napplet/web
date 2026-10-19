---
status: complete
date: 2026-10-03
pr: https://github.com/napplet/web/pull/222
---

# Protocol directory and daily refresh

Implemented `/protocol/`, 38 NAP detail pages, and `/protocol/contribute/` in the Astro site. The snapshot currently covers all five merged NAP files and all 33 open NAP proposals, including amendments and deferred tracks. Every entry links to the merged specification or the correct PR. Repository state, registry maturity and document markers remain separate. Pages are explicitly non-normative, render source text without HTML execution, and show source revision/freshness.

`pnpm generate:protocol` fetches the live registry and builds the pages; `pnpm refresh:protocol` only refreshes metadata. Reads are paginated and pinned to observed commits/blobs, including fork and removal PRs. A changed PR, incomplete tree, unexpected source format or failed API read aborts without replacing the old snapshot. Regular builds use the checked-in snapshot offline.

The existing Deploy site workflow now runs daily at 05:17 UTC, refreshing metadata before rebuilding and assembling the complete site. Main runs upload to the existing Bunny zone and purge the pull zone; nsite remains optional. Read-only GitHub permissions suffice, and no bot commit to protected main is required. Build-only manual dispatch and non-main branches skip publishing while preserving the verified artifact and snapshot. The schedule starts after this workflow reaches main.

## Requirement audit

| Requirement | Evidence |
|---|---|
| Protocol page and merged/draft table | `/protocol/index.html`; 38 rows from live API, status filters and text search |
| Individual NAP detail pages | All 38 output files verified, including headings, GitHub destinations, canonical URLs and sitemap entries |
| Contribution instructions and when to create a NAP | `/protocol/contribute/`; source-linked NAP/convention/NAAT/projection decision guide, proposal steps, generated template headings and current governance notes |
| Root generation script | `pnpm generate:protocol` completed against live GitHub locally and in the hosted Deploy site job |
| Cron refresh/rebuild/redeploy | Daily schedule in existing deployment workflow, refresh before build/upload, serialized deployment, main-only publishing; existing Bunny credentials present and previous main deploy succeeded |
| Updated links | Homepage NAP card and shared LINKS.naps point at `/protocol/`; README documents commands and deployment |
| Complete site stays valid | Assembler requires protocol pages; 65 internal URLs pass; existing showcase/player checks pass |

## Verification

- Nine generator tests cover Markdown formats, merge/draft separation, unregistered proposals, amendments, deferred parent tracks, forks, pagination, source changes, removal after default-branch deletion, and atomic failure.
- Assembly tests pass; generated pages use real static directory routes.
- `pnpm build`: 12 successful tasks. `pnpm type-check`: 17 successful tasks. `pnpm -r test:unit` and full `pnpm test` pass.
- Browser verification at 1440px, 390px and 320px: table filters, detail destinations, responsive overflow and contribution navigation. No-JavaScript navigation passes. Screenshots reviewed at `/tmp/napplet-protocol-screenshots/`.
- Existing showcase browser tests pass at all three widths, including interaction with all three signed previews, retry, focus restoration, motion and no-JS fallback.
- actionlint passes for both modified workflows. AI-slop is 84/100 (gate 70), with no findings in changed files; existing complexity warnings and two upstream dependency advisories remain.
- Hosted Deploy site build-only run [37169793610](https://github.com/napplet/web/actions/runs/37169793610) passed live generation, rebuild, assembly and every-route verification. Downloaded artifact reverified locally; refreshed metadata matches the local snapshot exactly excluding check time. Publishing steps correctly skipped.
- Hosted Link check run [37169795911](https://github.com/napplet/web/actions/runs/37169795911) passed.

PR #222 is stacked on the prerequisite Astro showcase PR #221. Merge that prerequisite before retargeting #222 to main. No production deployment or merge was performed by this task; the requested scheduled deployment path is implemented and its build artifact verified. Local assembled preview: http://localhost:8101/protocol/.
