---
quick_id: 261102-wmc
status: complete
---

# Summary

Six WebMCP tools register on every page of napplet.run, the VitePress docs included (lazy chunk from the docs theme), and `/apps/catalog.json` (102 apps, 76 KB) backs `search_napplets`.

## Verification

- `apps/web` vitest: 85 passed, including 20 new tests in `agent-tools.test.ts` and `agent-catalog.test.ts`.
- Root `pnpm build`, `pnpm type-check`, `pnpm -r test:unit` and `pnpm test:agent-output` (14 passed) are green; aislop 98/100 (the known `deepmerge` advisory only).
- Playwright Chromium with the built pages served at `https://napplet.run` (missing files from the live site): all five tools registered on `/`, `/apps/`, `/explainer/` and `/protocol/`; each executed correctly, `read_page` refused `https://example.com/`, `open_page` navigated to `/explainer/`, and there were no page errors.
- Native WebMCP: Chrome 149 with `--enable-features=WebMCP` exposes `navigator.modelContext` (not `document.modelContext`). It accepted all five registrations, listed them through `getTools()` and executed them through `executeTool()`. That build's `executeTool` takes the input as a JSON string.

- Follow-up in the same PR: `search_docs` (full text over `/docs/llms-full.txt`) and registration on docs pages. With Chrome 149 native WebMCP, `/docs/guide/getting-started.html` and `/apps/` both list all six tools; `search_docs` for "storage quota" returned `/docs/packages/shim.html`, and `read_page` on it returned that page's Markdown.

## Pending

The isitagentready `webMcp` check needs the deploy; re-scan after merge.
