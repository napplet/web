---
quick_id: 261021-x6c
status: complete
---

# Supplied duck icon

Implemented in `ee132426`. The website header/footer, website favicon, docs favicon and docs navigation now use the supplied purple duck PNG. Both public assets preserve the original bytes, including the black background. Removed the unused SVG favicons. Both apps are private; no package changeset is needed.

Verification:

- `pnpm build`: 12 tasks passed.
- `pnpm type-check`: 19 tasks passed.
- `pnpm -r test:unit`: passed.
- Playwright against built static output: both website logos and the docs navigation logo load; favicon requests return HTTP 200 with the supplied image bytes; logos remain visible at 390px and 1280px viewport widths. Desktop screenshots inspected at `/tmp/napplet-icon-web.png` and `/tmp/napplet-icon-docs.png`.
- Website mobile document width is 428px at a 390px viewport with either the original SVG or the new PNG; this existing overflow is outside the icon change. Docs remain 390px wide.
- `git diff --check`: passed; no old favicon references remain in either app.
- `aislop@0.12.0 scan --staged .`: formatting, code quality, AI-slop and lint engines report zero issues. Overall gate is 88/100 and exits 1 because unchanged dependencies have advisories: Vite (high), fflate (moderate), and @vitest/mocker (moderate). No rules were disabled or dependencies changed to suppress the findings.

Work is isolated in `/tmp/napplet-duck-brand-icon` on `chore/duck-brand-icon`, based on current `origin/main`. The original checkout and its unrelated changes remain untouched.
