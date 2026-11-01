# napplet.run edge script

A [Bunny Edge Scripting](https://bunny.net/docs/edge-scripting-middleware) middleware that serves the build-time Markdown copies of napplet.run pages to agents that send `Accept: text/markdown`. It is website plumbing for the napplet.run pull zone and has nothing to do with the napplet protocol.

- `markdown-negotiation.mjs` holds the request and response logic. It uses only web `Request`/`Response` and is unit-tested in `scripts/agent-markdown.test.mjs`.
- `bunny-middleware.mjs` is the Bunny entry point. `pnpm build:edge` bundles it to `edge/dist/bunny-middleware.js`, leaving the `@bunny.net/edgescript-sdk` import for the Bunny runtime to resolve.

## Behaviour

| Request | Result |
| --- | --- |
| `GET`/`HEAD` of a page with `Accept` containing `text/markdown` (q > 0) | Rewritten before the cache lookup to the page's `.md` copy: `/` → `/index.md`, `/explainer/` → `/explainer/index.md`, `/docs/guide/concepts.html` → `/docs/guide/concepts.md`. Response gets `Content-Type: text/markdown; charset=utf-8` and `Vary: Accept`. |
| A direct `.md` request | `Content-Type: text/markdown; charset=utf-8` and `Vary: Accept`. |
| Any HTML page response | `Vary: Accept` and `Link: <…md>; rel="alternate"; type="text/markdown"`. |
| `/conformance/…`, `/.well-known/…`, assets, other methods | Unchanged. |

## Caching

Bunny's documented behaviour, checked 2026-11-01:

- [Vary Cache](https://bunny.net/docs/cdn/vary-cache.md): the cache key is the request URL. Query strings are ignored unless the URL Query String option is on. The built-in vary options (WebP, AVIF, query string, country, hostname, mobile/desktop, cookie) do not include `Accept`. Varying on another header is "available via internal configuration" through Bunny support.
- [Middleware scripts](https://bunny.net/docs/edge-scripting-middleware): `onClientRequest` runs before the cache lookup, and a returned request "continue[s] to the cache lookup with the (modified) request". `onClientResponse` runs on every response, including cache hits.

Observed on the live pull zone before this script was deployed: a request with `Accept: text/markdown` for `/` got `content-type: text/html` with `cdn-cache: HIT`. One URL, one cached response, whatever the `Accept` header.

The design follows from that. The rewrite happens in `onClientRequest`, so the HTML page and its Markdown copy are looked up and cached under different URLs (`/explainer/` and `/explainer/index.md`). No `Accept`-based cache key is needed. `onClientResponse` adds `Vary: Accept` on every response, including hits, for browsers and downstream caches.

That Bunny caches the two separately is inferred from the documentation above and has not yet been observed on the CDN. `scripts/check-markdown-negotiation.mjs` tests it: it alternates Markdown and HTML requests for the same page twice, so the second round is served from cache, and fails if either client gets the other representation. The **Deploy site** workflow runs it right after deploying the script.

Both hooks only run when the pull zone has **Run script before cache** enabled (Pull Zone → General → Origin, or `EdgeScriptExecutionPhase: 2` in the Pull Zone API). With it off, the script does nothing and the site behaves as plain static hosting.

The nsite mirror cannot negotiate headers; agents using it fetch the `.md` paths directly.

## Deploying

The **Deploy site** workflow builds and deploys the script after the site upload, once two repository secrets exist. Until then it logs a notice and skips the step.

One-time setup:

1. In the Bunny dashboard, create a **Middleware** Edge Script (for example `napplet-run-markdown`) and link it to the napplet.run pull zone.
2. On that pull zone, enable **Run script before cache** (General → Origin).
3. From the script's **Deployments → Settings**, copy the script ID and deploy key into the repository secrets `BUNNY_EDGE_SCRIPT_ID` and `BUNNY_EDGE_DEPLOY_KEY`.
4. Re-run **Deploy site** (workflow dispatch) and verify:

```bash
curl -sI -H 'Accept: text/markdown' https://napplet.run/explainer/   # content-type: text/markdown; charset=utf-8, vary: Accept
curl -sI https://napplet.run/explainer/                              # content-type: text/html, vary: Accept, link: </explainer/index.md>; …
```

To try the middleware locally against the assembled site, run it with Deno and the SDK's local server (`servePullZone({ port, hostname }, { url: 'http://127.0.0.1:<static-port>' })`). The SDK 0.13.0 local server fails under Node 24 with an undici `Illegal invocation` error inside the SDK itself, so Deno is the reliable local runtime.

To deploy by hand instead, run `pnpm build:edge` and `bunny scripts deploy edge/dist/bunny-middleware.js <script-id>` with the [bunny CLI](https://bunny.net/docs/cli).
