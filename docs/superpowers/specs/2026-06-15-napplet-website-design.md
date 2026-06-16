# napplet.run — Informational SPA + VitePress Docs

**Date:** 2026-06-15
**Branch:** `feat/napplet-website`
**Status:** Approved design

## Goal

Ship a beautiful website that makes a visitor understand:

- The purpose of **NIP-5D** (Nostr Web Applets).
- How the `@napplet/*` packages fit together and where the **shell/runtime** sits.
- The benefits of the pattern and the **paradigm shift** it brings to Nostr.
- A clear traditional-client vs. NIP-5D-composable-client visual contrast.

Plus a VitePress documentation site shipped under `/docs`, a GitHub workflow that
deploys to **Bunny** and **nsite**, and a bash script to set the required secrets
via `gh`.

**Priority:** visitor comprehension. **Audience:** general developers + Nostr developers.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| SPA stack | **Svelte 5 + Vite** |
| Layout | **`apps/web`** (SPA) + **`apps/docs`** (VitePress), stitched at deploy |
| Aesthetic | **Purple Nostr-native** (deep aubergine canvas, ostrich-purple accents, soft glow) |
| Reference runtime | **Kehto** — named and linked on the site (user-approved 2026-06-15) |
| Domain | **napplet.run** (single config constant) |
| Bunny | Storage zone upload **+ pull-zone cache purge** |
| nsite | `sandwichfarm/nsite-action` with `nbunksec` secret |

## Architecture

Two workspace apps (already covered by the `apps/*` pnpm glob), assembled into one
deploy artifact:

```
apps/
  web/    # Svelte 5 + Vite SPA → site root
  docs/   # VitePress           → /docs
```

`apps/web` builds to `apps/web/dist`. `apps/docs` builds with `base: '/docs/'`.
At deploy, docs output is copied into `web/dist/docs`, producing a single directory
that ships unchanged to both Bunny and nsite. The SPA links to `/docs/`; docs links
back to the SPA. A `SITE_URL` constant (`https://napplet.run`) drives meta/canonical/sitemap.

## `apps/web` — the SPA

Single-page vertical scroll, sticky anchored nav, purple Nostr-native theme. Sections:

1. **Hero** — "Composable Nostr apps." One-sentence definition of napplet + NIP-5D. CTAs: Read the spec · Get started · Docs.
2. **The problem** — Monolithic clients re-implement feeds, DMs, profiles, relay mgmt, signing — every time. Graphic: one bloated client, duplicated.
3. **The shift (centerpiece)** — Animated side-by-side: traditional monolith vs. a **shell** hosting sandboxed **napplet** iframes. The requested traditional-vs-composable illustration.
4. **How it works** — JSON envelope (`{ type: "domain.action", ...payload }`) over `postMessage`. Animated flow: napplet → `relay.subscribe` → shell → relay → event back. Covers sandbox (`allow-scripts` only, no `allow-same-origin`), identity via unforgeable `MessageEvent.source`, NAPs as capability domains.
5. **Benefits** — card grid: keys never exposed · sandbox isolation · composability/reuse · smaller attack surface · user control · portability across shells.
6. **Paradigm shift** — shells compete on trust + UX (not feature count); mix-and-match apps; focused dev surface; an ecosystem of interoperable napplets.
7. **Where the runtime fits** — layered diagram: your napplet → `@napplet/shim`/`sdk` → NIP-5D envelope → shell/runtime (**Kehto**, linked) → Nostr network.
8. **Packages** — six cards (core, shim, sdk, nap, vite-plugin, boilerplate) → docs + npm/JSR.
9. **Get started** — `npx @napplet/boilerplate`, links to docs + spec.
10. **Footer** — spec (NIP-5D), GitHub, docs, Kehto.

Graphics are **inline Svelte/SVG components** — animated, no heavy chart libs — so they
stay crisp, themeable, and lightweight. Respect `prefers-reduced-motion`.

## `apps/docs` — VitePress

Sidebar groups:

- **Introduction** — what napplets are, NIP-5D in one page, who it's for.
- **Getting Started** — install, `npx @napplet/boilerplate`, first napplet, shim vs sdk.
- **Concepts** — JSON envelope, NAPs/NUBs, shell, sandbox model, identity, ACL, storage scoping, `shell.supports()`.
- **Packages** — one page each: core, shim, sdk, nap, vite-plugin, boilerplate (seeded from existing READMEs, kept accurate to current exports).
- **NAP domains** — reference for the 15 domains (relay, storage, inc, keys, theme, media, notify, identity, config, resource, connect, class, cvm, outbox, upload).
- **Spec** — links the authoritative NIP-5D source + reference status.

Purple theme via a VitePress theme override sharing tokens with the SPA. Nav links
back to the marketing site root.

## Deploy — `.github/workflows/deploy-site.yml`

- **Triggers:** push to `main` touching `apps/**` (+ the workflow/script); `workflow_dispatch`.
- **Steps:** checkout → pnpm/action-setup → setup-node 22 (pnpm cache) → `pnpm install --frozen-lockfile` → build `@napplet/*` deps → build web → build docs (`base:/docs/`) → assemble into one `site/` dir → **Bunny**: upload to storage zone, then purge pull zone → **nsite**: `sandwichfarm/nsite-action` with `directory: site`, `nbunksec`, relays/servers from repo variables.

## Secrets script — `scripts/setup-site-secrets.sh`

Interactive, idempotent `gh secret set` for the deploy. Validates inputs, never echoes
secrets, and explains where each value comes from:

- `NBUNK_SECRET` — bunker credential from `nsyte ci`; validates `nbunksec1` prefix (refuses `nsec`/`sec1`).
- `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_PASSWORD`, `BUNNY_STORAGE_ENDPOINT` — storage upload.
- `BUNNY_PULLZONE_ID`, `BUNNY_API_KEY` — cache purge.
- nsite `relays` / `servers` set as repo **variables** (`gh variable set`) with sane defaults.

Preflight: checks `gh` is installed and authenticated; confirms the target repo.

## Out of scope (YAGNI)

- No live in-browser napplet/shell demo runtime (link to Kehto instead).
- No CMS or blog.
- No i18n.
- No analytics.

## Success criteria

A polished, on-brand site where a developer who has never heard of napplets leaves
understanding NIP-5D, the package layering, where the shell/runtime fits, and why the
pattern matters — with working docs at `/docs` and a one-command deploy path.
