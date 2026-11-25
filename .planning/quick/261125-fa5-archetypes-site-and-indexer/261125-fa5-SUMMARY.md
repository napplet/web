---
quick_id: 261125-fa5
slug: archetypes-site-and-indexer
date: 2026-11-25
status: complete
branch: feat/archetypes-site
---

# Archetypes site and indexer: summary

Built archetypes.napplet.run from the approved mockups: an Astro field guide to the archetypes (`z`) and intents (`i`) that NIP-5D manifests advertise, fed by a relay-scoring indexer with a SQLite event store.

## Delivered

- `apps/archetypes-indexer`: NIP-66 relay discovery (kind 30166 `d` tags from three monitors), URL normalisation and dedupe, per-relay points (distinct napplet manifests served), a zero-point backoff ladder (1d, 3d, 7d, 14d, 30d), removal after consecutive failed connections with re-admission only on newer monitor evidence, signature-verified storage of kinds 5129/15129/35129 with per-relay sightings, incremental crawls, a full re-crawl of scored relays before each daily build, snapshot export (top-scored + pinned relays for browsers), Bunny Storage deploy with checksum skipping and stale-file deletion, a service loop with `/healthz` and `/status`, a Dockerfile and a generic compose file. Every tunable is in one optional YAML file with defaults (`archetypes.example.yaml`).
- `apps/archetypes`: index model shared by the build and the browser (snapshot folding by `a`/`A` lineage, archetypes, intents, parameter agreement, verbs, adoption), synonym-candidate heuristics with evidence (name containment/tokens/spelling, shared publisher, verbs, parameters, description words; co-advertised names are never candidates), editorial curation in `curation.yaml` (diverse, coalesce, distinct, parameter alignment), counts of unroutable spellings, pages for archetypes, intents, clusters and agents, Markdown copies for every page, `llms.txt`, `llms-full.txt`, `archetypes.json`, `relays.json`, robots, sitemap, JSON-LD and WebMCP tools, and a live top-up that merges manifests newer than the build.
- CI runs the built-site checker after `pnpm build`.

## Verification

- Indexer: 76 unit tests (real loopback WebSocket relays, in-memory SQLite, fake Bunny API); `tsc --noEmit` clean.
- Site: 64 unit tests plus the checker's own tests; `astro check` clean; 55 pages pass `check:site`.
- Repository: `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, `pnpm test:workflow-contracts` pass. AI-slop gate 94/100 (main is 93/100); the three remaining findings are dependency advisories that predate this branch (astro, @astrojs/svelte, @hono/node-server). Bumping them broke `apps/web`'s `astro check`, so they are left for a separate change.
- The container image builds and, in a one-tick run against two seed relays, crawled 796 manifests and built the site.

## Decisions

- Event store: SQLite via `node:sqlite` (user choice). Layout: `apps/archetypes` + `apps/archetypes-indexer` (user choice).
- Curation is site data changed by pull request; nothing is written to relays and no tags or kinds are added.
- The indexer only reads relays; the site only reads `z` and `i` (the legacy `archetype` tag some old events carry is ignored).

## Flags

- NIP-5D (`5D.md` at the PR head) still says archetype vocabulary is "defined outside this NIP by the archetype registry", while napplet/naps `ARCHETYPES.md` deprecates that registry with no replacement. Not filled here; worth a NIP-5D comment.
