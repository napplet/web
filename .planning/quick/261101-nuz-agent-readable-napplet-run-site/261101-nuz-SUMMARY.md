---
quick_id: 261101-nuz
slug: agent-readable-napplet-run-site
date: 2026-11-01
status: complete
---

# Summary: agent-readable napplet.run

- Build-time output on every surface: 76 page `.md` copies (49 web, 27 docs) with matching `<link rel="alternate" type="text/markdown">`, `/llms.txt`, `/llms-full.txt`, `/docs/llms.txt`, `/docs/llms-full.txt`, and `/.well-known/agent-skills/` (10 `skill-md` entries, 1 reproducible `.tar.gz` for `napplet-port-napp`).
- `assemble-site.mjs` fails the build on a missing alternate link or copy, a dangling llms.txt link, or a skill digest mismatch.
- `robots.txt` Content-Signal: `search=yes, ai-input=yes, ai-train=no`.
- Bunny middleware in `edge/` (before-cache rewrite to `.md`, `Vary: Accept`, `Link` on HTML). Verified with the real `@bunny.net/edgescript-sdk` 0.13.0 under Deno against the assembled site; deploy step gated on `BUNNY_EDGE_SCRIPT_ID` / `BUNNY_EDGE_DEPLOY_KEY`.
- Chose a local VitePress build step over `vitepress-plugin-llms`: the plugin reads raw source and would drop the catalog-generated NAP maturity notices.
- Drive-by: showcase skills source link fixed (`packages/skills` 404 → `skills/`).

## Verification

`pnpm build`, `pnpm type-check`, `pnpm -r test:unit` green; `pnpm test:agent-output` 14/14, `test:skills-contracts` 11/11, `test:workflow-contracts` 19/19; `check-protocol.mjs` and `check-links.mjs` (77 URLs) pass on the assembled site; aislop 98/100 (baseline, deepmerge only).

## Pending

Bunny dashboard setup (middleware script, Run script before cache, two secrets) and the post-deploy isitagentready re-scan. Before: level 1, failing linkHeaders, markdownNegotiation, contentSignals, agentSkills.

## Caching follow-up

Bunny's cache key is the URL alone (Vary Cache docs; observed live: `Accept: text/markdown` on `/` → `text/html`, `cdn-cache: HIT`). Cache separation of the rewritten `.md` URL is inferred from the middleware docs; `scripts/check-markdown-negotiation.mjs` verifies it live and runs in Deploy site right after the edge script publishes.
