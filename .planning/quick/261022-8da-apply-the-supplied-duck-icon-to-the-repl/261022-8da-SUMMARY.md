---
quick_id: 261022-8da
status: complete
---

# Replacement site icon

PR #221 now uses the supplied duck PNG for the Astro homepage header/footer, protocol navigation and shared favicon, retained Svelte explainer, and docs navigation/favicon. This supersedes the separate PR #264 implementation for the old main site. Both PNG assets preserve the original supplied bytes and black background; unused SVG favicons are removed.

Verification:

- `pnpm build`: 12 tasks passed.
- `pnpm type-check`: 18 tasks passed; Astro and Svelte diagnostics have zero errors/warnings.
- `pnpm -r test:unit`: passed.
- Playwright checked `/`, `/protocol/`, `/protocol/contribute/`, `/explainer/`, and `/docs/`: logo images load at 1280px and 390px viewport widths; PNG favicon requests return HTTP 200 and exactly match the supplied bytes. Inspected homepage screenshots at `/tmp/napplet-pr221-icon-desktop.png` and `/tmp/napplet-pr221-icon-mobile.png`.
- `git diff --check`: passed.
- Staged AI-slop scan: no formatting, code-quality, slop or lint issues. Overall security gate exits 1 at 79/100 for existing dependency advisories in http-cache-semantics, Vite, fflate, sanitize-html and @vitest/mocker. Package manifests and lockfiles are unchanged; no rules were disabled.

The change was prepared in `/tmp/napplet-pr221-icon` from PR #221 head `49ecd0b3`. Other worktrees remain untouched. Both apps are private; no package changeset is needed.
