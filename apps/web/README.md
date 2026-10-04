# napplet website

The Astro homepage introduces napplets and showcases runnable apps, shells, protocol status, napplet authoring tools, and shell development tools. The final Develop section fits a viewport at standard desktop and mobile sizes, with two concise paths: napplet agent skills and a Kehto tooling overview linking to its repository. Panels sit side by side on desktop and stack on mobile; content can grow naturally when text is enlarged. The original Svelte explainer remains at `/explainer/`. Astro renders the homepage content into static HTML; Svelte hydrates the explainer, while GSAP adds section reveals that respect reduced-motion preferences.

## Develop

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @napplet/web dev
# Or run the website and documentation together:
pnpm dev:site
```

The website runs at `http://127.0.0.1:5173/`. During development, `/docs` redirects to the documentation server at `http://localhost:5174/docs/`; run `pnpm dev:site` to start both. Documentation dependency optimization uses the same modern JavaScript target as its production build. Production serves `/docs/` from static files with directory indexes, so the site needs no application server or SPA fallback.

With `pnpm dev:site` running, run `node scripts/check-site-dev.mjs` to verify all three playable apps, homepage rendering, documentation navigation, and hydrated documentation search. Astro commands use separate dependency caches so running type-checks while previewing cannot invalidate lazy player imports.

## Curate

### Protocol directory

`/protocol/` is a non-normative directory of the living [napplet/naps](https://github.com/napplet/naps) repository. Entries appear in Merged, Open PR, then Draft PR order, alphabetically by NAP ID within each group. Every merged spec and open NAP proposal has a detail page rendering the complete upstream specification, with tables, code examples, a linked contents list, and links to the exact GitHub revision and discussion. `/protocol/contribute/` explains which changes belong in a NAP, convention, archetype, or projection, links the contributor rules, and displays the current template headings and governance excerpts.

```bash
# Refresh upstream data and build all Astro pages, including /protocol/:
pnpm generate:protocol
# Refresh only the checked-in source snapshot:
pnpm refresh:protocol
pnpm test:protocol
```

Generation uses `GH_TOKEN`, `GITHUB_TOKEN`, or an existing `gh auth` login. Anonymous requests are supported but GitHub's lower rate limit may be insufficient for the full registry. Reads use the current default branch commit and PR file blobs, follow pagination, and validate PR revisions before atomically replacing `src/data/protocol.json`. Failed or incomplete reads leave the last snapshot intact. Regular `pnpm build` uses that snapshot without network access.

Merge state is derived from files on the default branch; PR draft state comes from GitHub. Registry maturity and document markers remain separate because an upstream draft document can already be merged. Open amendments have their own PR-specific routes. Closed PRs disappear on refresh, merged proposals gain canonical detail routes, and the next Astro build recreates the output. Deferred tracks retain an explicit warning. The generated snapshot preserves the full, unmodified upstream Markdown alongside directory metadata. It is refreshed from upstream, never edited as an independent specification. A build-time Markdown renderer sanitizes embedded HTML and unsafe URLs, resolves relative links and images against the fetched source revision, and preserves all document sections. GitHub remains the source of truth.

The `Deploy site` workflow refreshes and rebuilds the complete site daily at **05:17 UTC**, on relevant pushes to `main`, and on manual dispatch. A refresh failure stops deployment. Successful main runs upload the assembled site to Bunny and purge its cache; optional nsite publishing follows. No bot commit or write permission on protected main is needed. The `protocol-site` workflow artifact retains the generated snapshot and site for seven days. Manual dispatch with `deploy=false` verifies generation and assembly without publishing; non-main dispatches always skip deployment. GitHub activates cron only after the workflow reaches the default branch.

After assembly, `node scripts/check-protocol.mjs` verifies every detail page, source destination, canonical URL, sitemap entry and the contribution guide. With the assembled site served, `node scripts/check-protocol-browser.mjs http://localhost:8099` checks desktop/mobile filtering and navigation, including without JavaScript. Link-check CI runs both checks.

Edit `src/lib/showcase.ts` to change the selected napplets, shells, and developer tools. Keep names, descriptions, source links, and destinations tied to maintained projects. Editorial descriptions are non-normative; protocol status and requirements defer to the living [NIP-5D proposal](https://github.com/nostr-protocol/nips/pull/2303) and [NAPs track](https://github.com/napplet/naps).

Playable entries point to locally mirrored signed manifests and their original artifact bytes. Preserve the publisher's signature and content hashes when adding or refreshing a selection; editing the downloaded HTML invalidates verification. The player verifies each signed manifest and artifact before execution. Its loader derives from the MIT-licensed [napplet.soy source](https://github.com/zeSchlausKwab/napplet-soy); retain the accompanying attribution when changing that implementation. A curated preview is a limited host for these selections, not a claim that the site implements every NAP.

## Verify the deployed artifact

Run from the repository root. Build conformance with its deployment base after the workspace build, since the default build uses a different asset path.

```bash
pnpm build
pnpm type-check
pnpm -r test:unit
pnpm --filter @napplet/web build
pnpm --filter @napplet/docs build
pnpm --filter @napplet/conformance-web build --base=/conformance/
node --test scripts/assemble-site.test.mjs
node scripts/assemble-site.mjs
pnpm exec playwright install chromium
pnpm test:spa-onboarding
python3 -m http.server 8099 --directory site
```

With that static server running, use another terminal:

```bash
node scripts/check-links.mjs http://localhost:8099
node scripts/check-showcase.mjs http://localhost:8099
```

The onboarding check starts its own Astro development server and exercises the preserved `/explainer/#start` flow. The showcase check exercises the assembled production site. Inspect desktop and mobile output when changing layout or animation.

## Deployment

`scripts/assemble-site.mjs` is shared by the deployment and link-check workflows. It places the homepage at `/`, the explainer at `/explainer/`, documentation at `/docs/`, and the conformance runtime at `/conformance/`. It checks for social artwork, robots and sitemap files, verifies the installer copies, and rejects conformance HTML built with the wrong base before replacing the previous artifact.

The deployment workflow uploads the resulting `site/` directory to Bunny storage and purges the pull zone. Bunny is the canonical deployment; nsite is an optional mirror. The existing Bunny storage zone, endpoint, password, API key, and pull-zone ID remain GitHub Actions secrets. Website, docs, conformance, lockfile, or assembly changes trigger deployment after merging to `main` and trigger the corresponding pull-request link check. Configure credentials with `scripts/setup-site-secrets.sh`.
