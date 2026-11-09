---
quick_id: 261101-nuz
slug: agent-readable-napplet-run-site
date: 2026-11-01
status: complete
---

# Agent-readable napplet.run

Make home, explainer, protocol directory and docs readable by agents with build-time files (work on Bunny and nsite) plus Accept-header Markdown negotiation at the Bunny edge. Website plumbing only; no NIP-5D/NAP surface changes.

## Tasks

1. `scripts/lib/agent-markdown.mjs` — pure helpers: page → `.md` path mapping, HTML → Markdown (main content, absolute links), VitePress source → Markdown (frontmatter/home hero, `:::` containers, link rewriting), llms.txt rendering, reproducible ustar+gzip, skills index. Unit tests in `scripts/agent-markdown.test.mjs`.
2. Docs (VitePress): `transformHead` adds `<link rel="alternate" type="text/markdown">`; `buildEnd` writes per-page `.md`, `/docs/llms.txt`, `/docs/llms-full.txt` from source with the nap-maturity transform applied. Chose a local build step over `vitepress-plugin-llms` because the plugin reads raw source and would drop the catalog-generated NAP maturity notices.
3. Web (Astro): `SiteLayout` adds the alternate link; `assemble-site.mjs` converts every web HTML page to `.md`, writes root `/llms.txt` + `/llms-full.txt`, `/.well-known/agent-skills/` (index, SKILL.md files, archives), and asserts every page has a non-empty `.md` with a matching alternate link and every digest matches.
4. `apps/web/public/robots.txt` Content-Signal line.
5. Bunny middleware edge script (`edge/markdown-negotiation/`) with pure tested logic; before-cache client hooks rewrite `Accept: text/markdown` to the `.md` URL (separate cache key), add `Vary: Accept` + `Link` on HTML. Deploy step in deploy-site.yml gated on secrets; manual steps documented.
6. Docs guide page `guide/agent-access.md` (non-normative), sidebar entry, READMEs; deploy workflow paths include `skills/**`, `edge/**`.
7. Fix showcase skills source link.
