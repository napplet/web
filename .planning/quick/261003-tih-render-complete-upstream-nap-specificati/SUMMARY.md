# Complete upstream specification pages

Implemented on `feat/protocol-directory` for PR #222. Supersedes the earlier metadata-only detail-page decision in quick task 261003-sof following the user's explicit request to read the specification here.

- All 38 detail pages render the full fetched Markdown, including API tables, wire examples, security considerations, references and changelogs.
- The generated snapshot preserves upstream text verbatim and links the exact source revision. Fork proposals use their head repository; removals use GitHub's original document URL. GitHub remains the canonical specification, with merge/draft/deferred state visible.
- Build-time rendering sanitizes embedded HTML and unsafe URLs, resolves relative links/images, namespaces heading anchors, and provides contents navigation. Tables and code scroll within the page on narrow screens. No client JavaScript is required.
- Website documentation now describes full document rendering and generated-source maintenance.

## Verification

- `pnpm build`: 12 tasks passed; `pnpm type-check`: 17 tasks passed; `pnpm -r test:unit`: passed.
- Generator: 9 tests passed. Renderer: 3 tests passed (content preservation, source-relative references, unsafe content); website unit suite: 11 tests passed.
- Assembled artifact: all 38 routes, source links, heading anchors, fenced examples, canonicals and sitemap entries passed.
- Browser: 1440px, 390px, 320px, contents links, tables/code overflow and no-JavaScript navigation passed. Desktop and mobile output visually inspected.
- NAP-BLOSSOM: all 21,057 bytes match upstream revision `ca1d7ba594e6790785dc770227085d8648d39631`.
- AI-slop: 84/100 against the configured 70 gate; no new findings. Existing CLI/script complexity findings and dependency advisories remain outside this change.
- Updated assembled preview: `http://localhost:8101/protocol/nap-blossom-pr-71/`.

No package release is needed: only the private website and its source-generation tooling changed. No production deployment or merge is performed. Hosted build/link results are recorded on PR #222.
