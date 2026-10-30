# napplet website

The Astro homepage introduces portable web apps through playable examples, real shells, protocol links, and four paths for app, shell, service, and tool builders. Manual and agent-assisted app development have separate links. A persistent app frame tracks the reading journey; GSAP reveals are specific to each section and respect reduced-motion preferences. Copy remains readable without JavaScript, and mobile layouts grow with their content. The technical Svelte explainer remains at `/explainer/`, with specifications in `/protocol/` and implementation guidance in `/docs/`.

## Develop

Use Node 24 LTS for the site toolchain. The installed Astro release requires Node >=22.23.4; CI and deployment use Node 24.

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @napplet/web dev
# Or run the website and documentation together:
pnpm dev:site
```

`pnpm dev:site` starts both servers in the foreground on available loopback ports and prints their URLs. `/docs` routes to the documentation server belonging to that launch, preserving paths and queries. Existing Astro previews and other worktrees can keep running; Ctrl+C stops both servers started by the command. Standalone web and docs commands also choose available ports. When running only the website, documentation links open the published docs; set `NAPPLET_DOCS_ORIGIN` to a separately started docs server's origin to use it instead. Documentation dependency optimization uses the same modern JavaScript target as its production build. Production serves `/docs/` from static files with directory indexes, so the site needs no application server or SPA fallback.

With `pnpm dev:site` running, run `node scripts/check-site-dev.mjs <website-url>` using the printed website URL to verify all three playable apps, homepage rendering, documentation navigation, and hydrated documentation search. Astro commands use separate dependency caches so running type-checks while previewing cannot invalidate lazy player imports.

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

## App and shell configuration

Edit `src/data/apps.json` for curated previews and `src/data/shells.json` for the shell directory. Each shell has `platforms`, a development `status`, an independent project URL and a source URL. Descriptions are editorial and non-normative; protocol requirements defer to the living [NIP-5D proposal](https://github.com/nostr-protocol/nips/pull/2303) and [NAPs track](https://github.com/napplet/naps). Platform labels were reviewed against project sources on 2026-10-28 and do not claim identical napplet support across every build.

A curated preview entry supplies `id`, `name`, `description`, `category`, `href`, optional `source`, `image`, `eventId`, `manifest`, `artifact`, and an explicit `format` (`current` or `archive`). Mirror the original signed manifest under `public/showcase/manifests/` and its exact artifact under `public/showcase/blobs/`. Add an actual screenshot under `public/showcase/images/`. Check the source license and add its notice to `public/showcase/NOTICE.txt`. The verifier tests every configured preview. The homepage selects the first three entries, currently all direct artifact-hash releases; `/apps/` shows the whole collection. No component edits are needed to add a preview or shell.

The three original previews remain explicitly archived releases with a private historical verifier. Three additional releases use direct artifact hashes from their own signed manifests. The player verifies each publisher signature and original artifact hash before execution, then grants no NAP domains. Apps needing shell services belong in a full shell. Current-release identity checks follow NIP-5D Identity; the preview is not a full protocol or manifest conformance certification. Some upstream releases still use `nostr://` source locations outside the current proposal's Source formats; signed events stay unchanged and source links use their HTTPS source archives. Loader attribution and app licenses are preserved in the notice.

## App store and discovery

`/apps/` includes six curated playable selections and signed public relay discoveries. `src/data/discovery.json` configures the relay list, request limit and timeout. Refresh the saved relay snapshot from the repository root with Node 24 LTS:

```bash
node scripts/refresh-showcase-apps.mjs
pnpm --filter @napplet/web test:unit
pnpm --filter @napplet/web build
```

The refresh pages each relay backwards with `until` (up to `maxEvents`, default 600), then requests kind 32267 Software Applications listings from the same publishers, and preserves both sets of original signed events in `src/data/discovered-apps.json` under `events` and `applications`; a failed relay pass leaves the snapshot intact. Ordinary site builds need no network. The catalog selects NIP-5D's own kinds (5129, 15129, 35129) with the `applesauce-common` manifest helpers, checks signatures and direct `x` hashes, treats descriptions as plain text, and deduplicates replaceable addresses. It does not use NIP-5A schemas or aggregate identities. Snapshots remain independent releases. This is display selection, not full conformance certification or code review.

Artwork follows the current NIP-5D text. A manifest `icon` (`sha256`, MIME) and `screenshot` tags (NIP-92 `key value` fields with exactly one `x <sha256>`) are fetched in the browser by hash from the manifest's `server` hints, verified with WebCrypto, checked against their declared format and decoded before an object URL is rendered (`src/lib/media.ts`). Screenshot tags without an `x` field, including the bare-hash shape some publishers still emit, are ignored as the proposal requires. When a manifest declares no usable media, a kind 32267 listing by the same publisher that names the release (through its `latest`/`a` address, an identifier prefix, or an identical name) supplies URL-based listing art and icon; that pairing is this site's display heuristic, not part of either proposal, and it never contributes to release identity (`matchListing` in `src/lib/catalog.ts`).

The page shows the saved collection twelve releases at a time; reaching the end reveals the next page without network access. Scrolling past the saved collection (or pressing "Check for new apps") opens an `applesauce-relay` `RelayPool` and an `applesauce-core` `EventStore` (signature-verified, seeded with the snapshot) and reconciles each configured relay over NIP-77 negentropy with `relay.sync()`, so only the manifests and listings this page lacks are downloaded. A relay whose information document does not list NIP-77, or whose negotiation fails, falls back to a bounded REQ and is then paged with `until` as the end comes into view until it runs dry. There is no paging button; a status line under the grid reports progress. A discovered release runs in this site's player when it requires no shell service (the player grants no NAP domains): its artifact is fetched by the manifest `x` hash from the manifest's `server` origins and verified before the sandboxed `srcdoc` frame loads. Every release also links to the web shells that take its address, configured through the `launch` field of `src/data/shells.json` (`{address}` is replaced with the NIP-19 pointer; `pointers` lists which kinds the shell accepts). napplet.soy opens `naddr` only; Paja and the applesauce loader example take `naddr` and `nevent`. `scripts/check-app-store.mjs` covers scroll paging, the NIP-77 attempt and request fallback (with routed NIP-11 documents), the listing fallback, and that visiting or paging the saved collection contacts no relay.

Search and collection filters run locally. Live relay discovery starts only when the visitor selects “Check for new apps.” Requests are bounded, closed after EOSE or timeout, and cancelled on page exit. Partial/offline results retain the saved collection. Visitors can open named releases in napplet.soy, view other signed releases, or copy an address into another shell; discovered artifacts are never executed by the curated preview. Static discovery links and the saved collection work without JavaScript.

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
node scripts/check-app-store.mjs http://localhost:8099
```

The onboarding check starts its own Astro development server and exercises the preserved `/explainer/#start` flow. The showcase check exercises the assembled production site. Inspect desktop and mobile output when changing layout or animation.

## Deployment

`scripts/assemble-site.mjs` is shared by the deployment and link-check workflows. It places the homepage at `/`, the explainer at `/explainer/`, documentation at `/docs/`, and the conformance runtime at `/conformance/`. It checks for social artwork, robots and sitemap files, verifies the installer copies, and rejects conformance HTML built with the wrong base before replacing the previous artifact.

The deployment workflow uploads the resulting `site/` directory to Bunny storage and purges the pull zone. Bunny is the canonical deployment; nsite is an optional mirror. The existing Bunny storage zone, endpoint, password, API key, and pull-zone ID remain GitHub Actions secrets. Website, docs, conformance, lockfile, or assembly changes trigger deployment after merging to `main` and trigger the corresponding pull-request link check. Configure credentials with `scripts/setup-site-secrets.sh`.

## Homepage presentation checks

`node scripts/check-showcase.mjs <assembled-site-url>` checks the four builder paths, the single below-fold network explanation, current signed previews, mobile layouts, no-JavaScript content, and section-specific GSAP choreography. It also switches reduced motion during a session to check cleanup. Regenerate the matching 1200×630 social card with `node scripts/generate-social-card.mjs` after changing its headline or visual motif.
