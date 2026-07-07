---
phase: 260706-eh0
plan: 01
subsystem: build-tooling
status: complete
tags: [vite-plugin, cli, nip-5a, manifest, title, description]
requires: []
provides:
  - "@napplet/vite-plugin title/description HTML injection options"
  - "@napplet/cli deploy-time title/description manifest tag extraction"
affects:
  - packages/vite-plugin
  - packages/cli
tech-stack:
  added: []
  patterns:
    - "transformIndexHtml returns { html, tags } html-string form to OVERRIDE existing tags (Vite tag descriptors only append)"
    - "bounded first-match regexes for title/meta parsing (no catastrophic backtracking over untrusted HTML)"
key-files:
  created:
    - .changeset/napplet-vite-plugin-title-description.md
    - .changeset/napplet-cli-title-description.md
  modified:
    - packages/vite-plugin/src/types.ts
    - packages/vite-plugin/src/html.ts
    - packages/vite-plugin/src/manifest.ts
    - packages/vite-plugin/src/index.ts
    - packages/vite-plugin/src/index.test.ts
    - packages/vite-plugin/README.md
    - apps/docs/packages/vite-plugin.md
    - packages/cli/src/manifest.ts
    - packages/cli/tests/manifest_test.ts
    - packages/cli/README.md
decisions:
  - "title/description injected as PLAIN HTML (<title> / <meta name=description>), never as napplet-* protocol meta — no invented wire/manifest surface"
  - "Only the spec-defined NIP-5A single-value title/description tags are emitted, reusing the existing snapshot passthrough at manifest.ts:89"
metrics:
  duration: ~15m
  completed: 2026-07-06
  tasks: 3
  files: 12
---

# Phase 260706-eh0 Plan 01: Populate NIP-5A title/description manifest tags Summary

End-to-end population of the spec-defined NIP-5A single-value `title` / `description`
manifest tags: authored in `@napplet/vite-plugin` as plain HTML (`<title>` +
`<meta name="description">`), then read back out of the built `index.html` by the
`@napplet/cli` at deploy time and emitted as `["title", …]` / `["description", …]`
manifest tags on root/named/snapshot manifests.

## What was built

**Task 1 — vite-plugin (`aba0691`):**
- Added optional `title?: string` / `description?: string` to `Nip5aManifestOptions`
  with JSDoc clarifying they are plain HTML, override-when-set / untouched-when-absent,
  and read back by the CLI.
- Added `applyHtmlMetadata(html, { title, description })` in `html.ts`: replaces the
  inner text of the first `<title>` (or inserts one after `<head>`), replaces the
  `content` of the first `<meta name="description">` (single/double quotes and either
  attribute order) or inserts one, HTML-escapes injected values (title element-text
  `& < >`; description attribute `& "`), and returns the input unchanged when both
  options are absent.
- Wired `transformIndexHtml` to return the `{ html, tags }` html-string form when
  either option is set (tag descriptors only append and cannot override an existing
  `<title>`/meta); unchanged tag-array behavior otherwise. Changed `buildIndexHtmlTags`
  return type to `HtmlTagDescriptor[]`.
- 6 new vitest cases (override, inject-when-absent for both, both-absent-untouched,
  quote/angle-bracket escaping).

**Task 2 — CLI (`5d85a12`):**
- Added `readIndexHtmlMetadataTags(indexHtmlPath)` in `manifest.ts`: extracts the first
  `<title>` inner text and the first non-empty `<meta name="description">` content,
  entity-decodes (`&amp; &lt; &gt; &quot; &#39;`, `&amp;` last) and trims them, emits at
  most one `["title", …]` / `["description", …]` tag, and returns `[]` on a missing file
  (`Deno.errors.NotFound`).
- Merged those tags with the existing `requires` metadataTags through `dedupeTags` in
  `createDeployManifestTemplates`, cached per candidate dir. Snapshot manifests inherit
  them via the existing passthrough at `manifest.ts:89` — no change to
  `createSnapshotManifestTemplate`.
- 3 new Deno tests (emit+trim; absent/empty omitted; dedupe first-non-empty-wins +
  coexist with requires + propagate to snapshot).

**Task 3 — changesets + verification (`838efa5`):**
- Two minor changesets (`@napplet/vite-plugin`, `@napplet/cli`).

## Verification

- `pnpm --filter @napplet/vite-plugin test:unit` — 22 passed
- `pnpm --filter @napplet/vite-plugin type-check` — clean
- `packages/cli` `deno task test:unit` — 52 passed; `deno task check` clean;
  `deno fmt --check` clean (reformatted the two touched files); `deno lint` clean
- `pnpm build` — 13/13 tasks successful
- `pnpm type-check` — 17/17 tasks successful (svelte-check 0 errors)
- `pnpm -r test:unit` — all packages green (0 failed)

## Deviations from Plan

None — plan executed as written. Formatting of the two touched CLI files was applied via
`deno fmt` (expected, per the CLI fmt gate).

## AI-slop gate

Could NOT be executed inside this sandbox: the pinned tool (`aislop@0.12.0`, as used by
`.github/workflows/ai-slop.yml` via `sandwichfarm/aislop-badge@v1`) is fetched from the
public registry, and the sandbox's external-package-execution policy blocked both the
`pnpm dlx aislop@0.12.0` and `npx aislop@0.12.0` invocations. This gate runs in CI on the
PR (`minimum-score: 70`, `fail-on-error: false`). Manual self-check of the new code:
no `TODO`/`FIXME`/placeholder/stub markers, JSDoc on every new exported/helper function,
real test vectors, style consistent with neighboring code.

## Protocol fidelity

No wire/manifest/meta surface beyond the spec-defined NIP-5A `["title", …]` /
`["description", …]` single-value tags was introduced. The vite-plugin injects plain HTML
`<title>` / `<meta name="description">` elements (standard HTML, not `napplet-*` protocol
meta). The CLI reuses the pre-existing snapshot passthrough (`manifest.ts:89`) that already
copies `title`/`description` tags. Nothing here changes what an interoperable shell or a
conformant napplet must do.

## Known Stubs

None.

## Self-Check: PASSED

- Files created: `.changeset/napplet-vite-plugin-title-description.md`,
  `.changeset/napplet-cli-title-description.md` — FOUND
- Commits: `aba0691`, `5d85a12`, `838efa5` — all FOUND in git log
