# Agent access to napplet.run

> How AI agents can read napplet.run as Markdown and discover the napplet agent skills. This page describes website plumbing only. It is non-normative and is not part of the napplet protocol: [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) and the [NAPs](https://github.com/napplet/naps) remain the canonical sources for every protocol requirement.

## What is served

| Want | Fetch |
| --- | --- |
| An index of the whole site | [`/llms.txt`](https://napplet.run/llms.txt) ([llmstxt.org](https://llmstxt.org/) format) |
| Everything in one file | [`/llms-full.txt`](https://napplet.run/llms-full.txt) |
| An index of the docs only | [`/docs/llms.txt`](https://napplet.run/docs/llms.txt) and [`/docs/llms-full.txt`](https://napplet.run/docs/llms-full.txt) |
| One page as Markdown | The page path with `.md`: `/index.md`, `/explainer/index.md`, `/protocol/index.md`, `/docs/guide/getting-started.md` |
| The agent skills | [`/.well-known/agent-skills/index.json`](https://napplet.run/.well-known/agent-skills/index.json) |

Every HTML page on the site (home, app store, explainer, protocol directory and docs) has a Markdown copy at a fixed path:

- A directory page such as `/explainer/` maps to `/explainer/index.md`.
- A docs page such as `/docs/guide/concepts.html` maps to `/docs/guide/concepts.md`.

Each HTML page also names its copy in `<head>` with `<link rel="alternate" type="text/markdown" href="…">`.

The copies are generated at build time from the same source as the HTML. The app store page lists the apps captured in its last build snapshot, not the live relay results.

## Asking for Markdown with a header

On napplet.run, a `GET` or `HEAD` request whose `Accept` header includes `text/markdown` receives the Markdown copy at the page's normal URL:

```bash
curl -H 'Accept: text/markdown' https://napplet.run/docs/guide/getting-started.html
```

The response has `Content-Type: text/markdown; charset=utf-8` and `Vary: Accept`. HTML responses carry `Vary: Accept` and a `Link: <…>; rel="alternate"; type="text/markdown"` header that points at the copy. Header negotiation needs the CDN edge script, so the nsite mirror serves only the `.md` files. If a request with this header still returns `text/html`, fetch the `.md` path directly.

## Agent skills discovery

[`/.well-known/agent-skills/index.json`](https://napplet.run/.well-known/agent-skills/index.json) follows the [Agent Skills Discovery RFC](https://github.com/cloudflare/agent-skills-discovery-rfc) v0.2.0. It lists every [`napplet-*` skill](./agent-skills) with its `description`, a `url` and a `sha256` digest of the exact bytes served:

- A skill that is only a `SKILL.md` is served at `/.well-known/agent-skills/<name>/SKILL.md`.
- A skill with supporting files is served as `/.well-known/agent-skills/<name>.tar.gz`, with `SKILL.md` at the archive root.

Verify the digest before using a skill. To install the skills into a coding agent instead, use `npx skills add napplet/napplet` as described in [Agent skills](./agent-skills).

## Usage preferences

[`/robots.txt`](https://napplet.run/robots.txt) allows all crawlers and declares a [Content Signals](https://contentsignals.org/) preference: `search=yes, ai-input=yes, ai-train=no`.
