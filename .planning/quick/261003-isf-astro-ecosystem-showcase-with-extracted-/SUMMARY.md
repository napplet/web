---
status: complete
---

# Astro ecosystem showcase

The homepage is now an Astro static page with six viewport sections: introduction, runnable napplets, shells, protocol status, app tooling, and shell tooling. The original Svelte page remains at `/explainer/` with a homepage link and its onboarding interaction intact. Purple canvas/grid styling and purposeful GSAP motion preserve the visual identity; no-JS content and reduced-motion remain readable.

The preview adapts napplet.soy's MIT loader. It runs Impossible Machine, Rail Game, and Sketch Loop from original signed releases resolved from relay.napplet.soy, mirrored locally with licenses/provenance, and verified again before srcdoc execution. It grants no host domains; account/persistent-save features remain in the linked full shells. No private HTML metadata or handshake is a loading prerequisite. Keyboard users can Tab to Close; Escape within an opaque child frame cannot reach the outer dialog.

Bunny and link-check share one artifact assembler. Literal static routes, docs, conformance, installers, images, manifests, and assets are validated. No SSR adapter or SPA rewrite is required. Existing Bunny secret names exist, and the latest inspected upload/purge run succeeded. The change is private website output plus development dependencies; no public package output change or changeset is required.

## Local verification

- `pnpm install --frozen-lockfile` — passed.
- `pnpm build` — all 12 tasks passed with Astro 7 / Vite 8 for the website and compatible legacy Vite for other packages.
- `pnpm type-check` — all 17 tasks passed.
- `pnpm -r test:unit` — passed, including eight player tests using real signed releases and deliberate tamper cases.
- `pnpm test` — passed, including tutorial build/conformance (5 pass, 0 fail, 5 conditional skips).
- `pnpm lint` — passed (no configured tasks).
- `node --test scripts/assemble-site.test.mjs` — 3 passed; wrong conformance base and missing files are rejected before replacement.
- `pnpm test:spa-onboarding` — desktop/tablet/mobile/narrow explainer checks passed.
- `node scripts/check-showcase.mjs http://127.0.0.1:8099` — passed at 1440×900, 390×844, 320×568; every app launches and interacts, sandbox/storage checks pass, failure/retry and cleanup/focus pass; no-JS, metadata, explainer, motion pass.
- `node scripts/check-links.mjs http://127.0.0.1:8099` — 25 internal URLs checked, no broken links. Curated shell/runtime external destinations all returned 200.
- Manual desktop layout check — all six sections exactly 900px high at 1440×900. Mobile content expands without overflow.
- Lighthouse mobile on the assembled artifact — Performance 95, Accessibility 100, Best Practices 100, SEO 100. A prior run scored performance 97; local uncompressed Python-server measurements vary. Zero layout-shift score penalty. Images have responsive 480/960px WebP sources; runner verification is deferred until launch.
- AI-slop — 88/100, above the existing 70 gate; only no-fix upstream advisories for http-cache-semantics and braces remain. No rule or threshold disabled. Format/lint/code-quality/AI-slop engines report zero findings.
- `git diff --check` — passed.

## Completion audit

All requested content, original-page preservation, runnable curated apps, shell/tool curation, Astro/SEO, responsive viewport sections, shared visual style and GSAP sequences have direct source and browser evidence. PR [#221](https://github.com/napplet/web/pull/221) is open and mergeable. Hosted CI, conformance, link/browser verification and AI-slop checks passed on c920bd23. Live Bunny root and directory routes return 200, and response headers impose no inherited CSP that would block the preview. Production deployment follows merge, as requested by the ready-to-merge stop condition. This final documentation commit changes no shipped output.

## Hosted evidence

- [CI](https://github.com/napplet/web/actions/runs/37146498012) — passed.
- [Conformance](https://github.com/napplet/web/actions/runs/37146498022) — passed.
- [Link and browser checks](https://github.com/napplet/web/actions/runs/37146498000) — passed on the assembled static artifact.
- [AI-slop](https://github.com/napplet/web/actions/runs/37146498041) — passed.
