---
quick_id: 261102-wmc
slug: site-webmcp-tools
date: 2026-11-02
status: complete
---

# WebMCP tools on napplet.run

Follow-up to 261101-nuz. isitagentready scored napplet.run level 4; of the remaining failing checks, WebMCP is the only one that describes real site behaviour rather than an API, auth server, MCP server or agent the site does not have.

Website plumbing only, not napplet protocol: WebMCP is a W3C Web Machine Learning CG draft (https://webmachinelearning.github.io/webmcp/), and the tools read files the site already publishes.

## Work

1. `apps/web/src/lib/agent-catalog.ts` + `src/pages/apps/catalog.json.ts`: `/apps/catalog.json`, the app store's build snapshot (curated, then discovered newest first) through the same catalog pipeline as `apps.astro`.
2. `apps/web/src/lib/agent-tools.ts`: `list_pages` (llms.txt), `read_page` (Markdown copy), `search_napplets` (catalog.json, untrusted-content hint), `list_agent_skills` (Agent Skills index), `open_page` (same-origin navigation). Feature-detect `document.modelContext`, fall back to `navigator.modelContext`.
3. Register from `SiteLayout.astro`, so every Astro page has them (VitePress docs pages do not).
4. Tests for path mapping, the same-origin guard, llms.txt parsing, search, each tool and registration.
5. Document both in `apps/docs/guide/agent-access.md`.
