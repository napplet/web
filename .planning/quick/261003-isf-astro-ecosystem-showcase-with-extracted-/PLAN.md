---
status: complete
description: Replace the marketing homepage with an Astro ecosystem showcase and verified in-page runner.
---

# Ecosystem showcase

The user requests an Astro single-page homepage with a brief introduction above the fold, curated runnable napplets, shells, protocol status, napplet authoring tools, and shell runtime tools. Preserve the existing explainer at `/explainer/` and link to it. Retain the existing aesthetic; use responsive viewport-sized sections and purposeful GSAP reveals. Deliver a ready-to-merge PR with the Bunny artifact and deployment path verified.

## Decisions and sources

- Isolated worktree `/Users/sandwich/Develop/napplet-showcase`, branch `feat/astro-ecosystem-showcase`, based on current `origin/main` (956135bf). Original checkout has unrelated work and remains untouched.
- Astro static output; Svelte integration retains the existing explainer. Homepage content remains readable without JavaScript. No server adapter required by Bunny.
- Protocol text is non-normative and links to living [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303), [NIP-5A](https://github.com/nostr-protocol/nips/pull/2287), and [NAPs](https://github.com/napplet/naps). Current NIP-5D PR is open, inspected at head 24711d9. Do not use the stale PR description as specification text.
- Runner work derives from napplet.soy's public source, preserving attribution and license. Verify all manifest signatures, path bytes, aggregate hash, iframe source binding and pre-script namespace injection against NIP-5D Transport / Identity / Security Considerations. Surface any unresolved source/spec conflict.
- Viewport height is a minimum so mobile, zoom, and larger text cannot clip content. Reduced-motion disables ornamental movement; keyboard and no-JS paths remain useful.

## Execution

1. Research and record the existing visual system, real curated items, soy runner architecture and licensing, Astro integration, and deployment contract.
2. Build the static Astro homepage, preserve `/explainer/`, add SEO metadata/social art/sitemap, and implement section-specific GSAP sequences.
3. Extract the runnable showcase, including trustworthy loading, error/retry/close behavior, keyboard focus, cleanup, and meaningful tests.
4. Verify desktop/mobile rendering, no-JS/reduced-motion, accessibility, all runnable items, links, artifact assembly, and Bunny's existing workflow. Update docs and CI verification.
5. Run build, type-check, unit tests, required existing checks, and AI-slop gate; commit checkpoints, push, open a PR and inspect CI. Audit every user requirement before marking complete.

## Verification evidence required

- Static HTML contains every curated section and valid canonical/description/OG/schema metadata.
- Old explainer renders at its own real static route and is linked from home.
- Every curated launch runs in the local site, with signature/hash rejection and teardown tests.
- Browser screenshots at desktop and mobile, with no overflow or blocked controls, meaningful animations and reduced-motion behavior.
- The exact deployment artifact includes root, explainer, docs, conformance, installers and all runtime assets; direct route requests work without SPA fallback.
- Required local gates and PR CI pass. Deployment settings/secrets and latest Bunny run inspected without disclosing secrets.

## Plan review

All six content requirements, four design requirements, Astro/SEO, preservation, runner reuse, and shipping are represented above. No package protocol surface is introduced. A changeset is only needed if public package output changes; this private site alone needs none.
