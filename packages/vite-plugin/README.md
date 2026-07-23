# @napplet/vite-plugin

> Vite plugin for napplet local development -- injects aggregate hash meta tags and optionally generates NIP-5A manifests for testing.

**This is a development tool.** For production deployment of napplets to nsites, use community deploy tools like [nsyte](https://github.com/nicefarm/nsyte) which handle NIP-5A event creation and relay publishing.

## Getting Started

### What This Plugin Does

During **dev mode**, the plugin injects empty meta tags into your HTML so the napplet shim can find them:

```html
<meta name="napplet-aggregate-hash" content="">
<meta name="napplet-napp-type" content="my-napp">
```

At **build time** (with `VITE_DEV_PRIVKEY_HEX` set), the plugin:

1. Optionally rewrites local JS/CSS build assets into `index.html` when `artifactMode: 'single-file'` is enabled
2. Walks the final `dist/` artifact set and computes SHA-256 of each file
3. Computes the aggregate hash per the NIP-5A algorithm (over the `path` tags alone)
4. Creates a NIP-5D **kind 35129** named-napplet manifest event — NIP-5A tag schema: one `['path', '/abs/path', '<sha256>']` per file plus one aggregate `['x', '<aggregateHash>', 'aggregate']` tag — and signs it
5. Writes `.nip5a-manifest.json` to `dist/`
6. Updates the meta tag in `dist/index.html` with the computed hash
7. Injects `<meta name="napplet-config-schema">` into `dist/index.html` if a `configSchema` is declared or discovered
8. Embeds the schema as a `['config', ...]` tag on the manifest (NOT folded into `aggregateHash` — the aggregate is `path` tags only, per NIP-5D §Identity)

The build-time manifest is for verifying the hash computation workflow locally, not for deploying to relays.

### When to Use This

- You are building a napplet and testing locally with a shell implementation
- You want to verify aggregate hash computation before deploying

### When NOT to Use This

- Deploying napplets to production (use [nsyte](https://github.com/nicefarm/nsyte) or similar)
- Creating NIP-5A events for relay publishing (use dedicated deploy tools)
- Runtime dependencies -- this plugin runs at build/dev time only

## Installation

```bash
npm install -D @napplet/vite-plugin
```

Note: This is a **devDependency**. It is not needed at runtime.

## Quick Start

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    nip5aManifest({ nappletType: 'my-napp' }),
  ],
});
```

## Configuration

### Plugin Options

#### nappletType (required)

**Type:** `string`

The napp type identifier (e.g., `'feed'`, `'chat'`, `'profile'`). This value is:

- Injected as the `content` of the `<meta name="napplet-napp-type">` tag
- Used as the `d` tag in the kind 35129 manifest event

#### requires (optional)

**Type:** `string[] | { infer?: boolean; explicit?: string[]; mode?: 'warn' | 'error' }`

An array of bare NAP domain names this napplet requires from its host shell
(e.g., `['outbox', 'storage']`), or an opt-in inference config. When set:

- Injects a `<meta name="napplet-requires">` tag into HTML (comma-separated domain names)
- Adds `['requires', 'domain']` tags to the kind 35129 manifest event

With inference enabled, the plugin scans statically visible source usage of
`@napplet/nap/<domain>`, SDK domain subpath imports, and direct
`window.napplet.<domain>` access. Explicit requirements remain the
author-controlled declaration; inferred domains are merged as tooling assistance
and can warn or fail when explicit config is missing a domain.

If the shell does not support all required domains, the napplet can detect this
at runtime via `window.napplet?.domain` presence or the shell can show a
compatibility warning.

#### title (optional)

**Type:** `string`

Human-readable napplet title. When set, the plugin **sets/overrides** the built
HTML `<title>` element (inserting one after `<head>` if the document has none),
replacing any author-written title. This is **plain HTML** — NOT a `napplet-*`
protocol meta tag. When omitted, the author's existing `<title>` is left
untouched and no empty tag is emitted.

The injected value is HTML-escaped for element-text context (`&`, `<`, `>`). At
deploy time the napplet CLI reads this back out of the built `index.html` and
emits it as the NIP-5A `["title", …]` manifest tag.

#### description (optional)

**Type:** `string`

Human-readable napplet description. When set, the plugin **sets/overrides** the
built HTML `<meta name="description">` element (inserting one after `<head>` if
absent), replacing any existing description meta. This is **plain HTML** — NOT a
`napplet-*` protocol meta tag. When omitted, the author's existing description
meta is left untouched and no empty tag is emitted.

The injected value is HTML-escaped for attribute context (`&`, `"`). At deploy
time the napplet CLI reads this back out of the built `index.html` and emits it
as the NIP-5A `["description", …]` manifest tag.

```ts
nip5aManifest({
  nappletType: 'my-feed',
  title: 'My Feed',
  description: 'A cozy Nostr feed napplet',
});
// → built index.html carries <title>My Feed</title>
// → built index.html carries <meta name="description" content="A cozy Nostr feed napplet">
// → napplet CLI emits ["title", "My Feed"] and ["description", "A cozy Nostr feed napplet"]
```

#### configSchema (optional)

**Type:** `NappletConfigSchema | string | undefined`

Declares a JSON Schema (draft-07+) describing the napplet's per-napplet configuration surface (NAP-CONFIG). At build time, the plugin:

- Validates the schema against the NAP-CONFIG Core Subset (see Build-Time Guards below)
- Embeds the schema as a `['config', JSON.stringify(schema)]` tag on the kind 35129 manifest event
- Injects `<meta name="napplet-config-schema" content="{json}">` into `dist/index.html` so the napplet's shim can read it synchronously at install time

  The schema is **not** folded into `aggregateHash`: per NIP-5D §Identity the aggregate is the NIP-5A hash of the `path` tags alone, so a runtime can recompute and verify it. The `config` tag still carries the schema for a shell to act on.

**Accepted forms:**

| Value | Behaviour |
|-------|-----------|
| `NappletConfigSchema` object | Used directly |
| `string` (path) | Resolved relative to the Vite project root; read + parsed as JSON |
| `undefined` (omitted) | Falls through to convention-file discovery |

**Discovery precedence** (when `configSchema` is not provided):

1. `options.configSchema` (inline object or path string) -- highest priority
2. `config.schema.json` at the project root -- convention file
3. `napplet.config.ts` / `napplet.config.js` / `napplet.config.mjs` at the project root, exporting a `configSchema` named export (or on the default export) -- dynamic import fallback

If none of the three paths resolve a schema, manifest/meta emission for the config tag is skipped silently -- build produces bytes identical to a pre-phase-114 napplet.

#### archetypes (optional)

**Type:** `Array<{ slug: string; convention: string; eventKinds?: number[] }>`

Declares the NAAT archetype roles this napplet fulfills ([living archetype
registry](https://github.com/napplet/naps/blob/master/ARCHETYPES.md)). Each entry
emits **one** `['archetype', slug, convention, ...kindFields]` tag on the kind
35129 manifest event. `convention` is a queryless stable identity and every
optional `eventKinds` value becomes a trailing same-tag `kind:<number>` field.
A napplet may declare several archetype roles; a napplet with no archetype tag
is fully valid.

```ts
nip5aManifest({
  nappletType: 'my-feed',
  archetypes: [
    { slug: 'note', convention: 'napplet:note/open', eventKinds: [1, 30023] },
    { slug: 'profile', convention: 'napplet:profile/open' },
  ],
});
// → emits ['archetype', 'note', 'napplet:note/open', 'kind:1', 'kind:30023']
// → emits ['archetype', 'profile', 'napplet:profile/open']
```

Like the `config` tag, archetype tags are **not** folded into `aggregateHash`: per NIP-5D §Identity the aggregate is the NIP-5A hash of the `path` tags alone, so declaring archetypes never changes the napplet's content address. Blank slugs are skipped.

One object always represents one convention contract; repeat objects for several
conventions. The plugin rejects query-bearing metadata and does not define a
payload schema or infer an event kind from payload content. `eventKinds` is
unsigned discovery metadata only. This non-normative guide follows the adopted
[NAP-INC #89 `4593ce9`](https://github.com/napplet/naps/blob/4593ce9e301ce098fd3dad64206fcd6f144fa7af/naps/NAP-INC.md),
[URI terminology #90 `896c32c`](https://github.com/napplet/naps/commit/896c32c92deee68dc4d10fc1132b62df20cccb6f),
and [NAP-INTENT #91 `a718915`](https://github.com/napplet/naps/blob/a718915ddefa2f03a0126579601f59d8bd86f7c4/naps/NAP-INTENT.md).

#### artifactMode (optional, v1.11+)

**Type:** `'external-assets' | 'single-file'`
**Default:** `'external-assets'`

Controls the build artifact shape the plugin validates and hashes.

| Value | Behaviour |
|-------|-----------|
| `'external-assets'` | Preserve Vite's default `index.html` + JS/CSS asset graph. Inline executable scripts are allowed. |
| `'single-file'` | Force Vite toward a single emitted artifact, inline local JS/CSS build asset references into `index.html`, and fail if local external assets remain before aggregate-hash and manifest generation. |

Use `single-file` when the napplet is meant to be served as a production-equivalent NIP-5A gateway artifact: a gateway-portable `index.html` loaded in an opaque-origin NIP-5D iframe without relying on separate local JS/CSS bundle routes.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    nip5aManifest({
      nappletType: 'my-napp',
      artifactMode: 'single-file',
    }),
  ],
});
```

In single-file mode:

- The plugin preserves any inline executable scripts already present in the built HTML.
- It asks Vite/Rollup for a single-entry artifact shape (`inlineDynamicImports`, no CSS code-split, inline static assets) so ordinary static and dynamic imports are bundled before the close-bundle rewrite.
- It then rewrites local stylesheet links and local script `src` tags to inline `<style>` / `<script>` blocks and removes those inlined JS/CSS files from `dist/`.
- It fails the build if any local stylesheet, modulepreload, script `src`, or extra emitted file remains after rewriting.
- The resulting `index.html` artifact bytes are used for the real `['path', '/index.html', <sha256>]` manifest tag and aggregateHash input.
- The aggregate hash is computed after inlining and before the self-referential aggregate-hash meta stamp is replaced.
- `config` is emitted as its own manifest tag but does NOT participate in `aggregateHash` — the aggregate is the NIP-5A hash of the `path` tags alone.

**Example (inline):**

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    nip5aManifest({
      nappletType: 'my-napp',
      configSchema: {
        type: 'object',
        properties: {
          theme: { type: 'string', enum: ['light', 'dark'], default: 'dark' },
          pollIntervalSeconds: { type: 'integer', minimum: 10, maximum: 3600, default: 60 },
        },
        required: ['theme'],
      },
    }),
  ],
});
```

**Example (convention file):**

```json
// config.schema.json (at project root)
{
  "type": "object",
  "properties": {
    "theme": { "type": "string", "enum": ["light", "dark"], "default": "dark" }
  },
  "required": ["theme"]
}
```

```ts
// vite.config.ts -- no configSchema option; picked up from config.schema.json
nip5aManifest({ nappletType: 'my-napp' });
```

**Example (napplet.config.ts fallback):**

```ts
// napplet.config.ts (at project root)
import type { NappletConfigSchema } from '@napplet/nap/config/types';

export const configSchema: NappletConfigSchema = {
  type: 'object',
  properties: {
    theme: { type: 'string', enum: ['light', 'dark'], default: 'dark' },
  },
  required: ['theme'],
};
```

#### Build-Time Guards

The plugin validates the resolved schema against the NAP-CONFIG Core Subset at `configResolved` and throws a multi-line error (aborting the Vite build) on any of these rule violations:

| Error code | Trigger |
|------------|---------|
| `invalid-schema` | Root is not `{ type: "object", ... }` |
| `pattern-not-allowed` | Schema uses `pattern` anywhere in the tree (ReDoS risk per CVE-2025-69873) |
| `ref-not-allowed` | Schema uses `$ref` in any form |
| `secret-with-default` | A property marked `x-napplet-secret: true` also declares a `default` |

The walk recurses into `properties`, `items`, `additionalProperties`, `patternProperties`, `oneOf`, `anyOf`, `allOf`, `not`, `definitions`, and `$defs` -- the guard is wide even though the Core Subset is narrow.

### Environment Variables

#### VITE_DEV_PRIVKEY_HEX

**Type:** `string` (hex-encoded 32-byte private key)

If set, the plugin signs the manifest event at build time. If not set, manifest generation is gracefully skipped (dev mode works without it).

**Security:** NEVER use a real private key here. Use a dedicated test key generated for local development only:

```bash
# Generate a test key (using nostr-tools or similar)
node -e "import('nostr-tools/pure').then(m => console.log(Buffer.from(m.generateSecretKey()).toString('hex')))"
```

## NAP Domain Requirements

Use the `requires` option when your napplet needs specific NAP domains to
function correctly.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    nip5aManifest({
      nappletType: 'my-feed',
      requires: ['outbox', 'storage'],
    }),
  ],
});
```

Inference can be enabled when you want the plugin to check source usage against
the explicit declaration:

```ts
nip5aManifest({
  nappletType: 'feed',
  requires: {
    infer: true,
    explicit: ['relay'],
    mode: 'warn',
  },
});
```

### What gets injected

With `requires: ['outbox', 'storage']`, the plugin injects into your HTML `<head>`:

```html
<meta name="napplet-aggregate-hash" content="">
<meta name="napplet-napp-type" content="my-feed">
<meta name="napplet-requires" content="outbox,storage">
```

At build time (with `VITE_DEV_PRIVKEY_HEX` set), the manifest event also includes `requires` tags:

```json
{
  "kind": 35129,
  "tags": [
    ["d", "my-feed"],
    ["path", "/index.html", "<sha256>"],
    ["x", "<aggregateHash>", "aggregate"],
    ["requires", "outbox"],
    ["requires", "storage"]
  ]
}
```

### Runtime compatibility checking

The host shell reads `<meta name="napplet-requires">` during napplet initialization and compares against its supported NAP domains. Napplets can also check at runtime:

```ts
if (!window.napplet?.outbox) {
  console.warn('OUTBOX NAP not available — feed disabled');
}
```

## Build-Time Diagnostics

v0.29.0 adds a build-time safeguard enforced in `closeBundle` so misconfiguration fails loud before `dist/` reaches a shell.

### Inline scripts are supported (and expected)

Per NIP-5D a napplet is a single self-contained `/index.html` loaded via
`iframe.srcdoc` with `sandbox="allow-scripts"` and no `allow-same-origin` — an
opaque origin with no served URL. Its executable JS therefore lives **inline**;
there is no origin from which the runtime could fetch an external
`<script src>`. The plugin does **not** reject inline `<script>` elements. (An
earlier version did under a loading model that NIP-5D does not define; that was
removed — see napplet/web#53.)

When `artifactMode: 'single-file'` is set, the plugin additionally folds any
local `<script src>`/`<link rel="stylesheet">` build assets into `index.html`
and deletes them, so the single file is the only served artifact. Pre-existing
inline scripts in your built HTML are preserved verbatim.

## How It Works

### Dev Mode (`transformIndexHtml`)

Injects two meta tags into the HTML `<head>`:

```html
<meta name="napplet-aggregate-hash" content="">
<meta name="napplet-napp-type" content="<nappletType>">
```

The empty aggregate hash tells the shell this is a development build. The shell reads these tags during napplet registration to resolve the aggregate hash for ACL scoping.

### Build Mode (`closeBundle`)

Only runs if `VITE_DEV_PRIVKEY_HEX` is set:

1. If `artifactMode: 'single-file'` is set, rewrites local JS/CSS references into `index.html` before hashing
2. Walks `dist/` directory recursively
3. Computes SHA-256 hash of each file's contents
4. Creates sorted hash lines: `<sha256hex> <absolutePath>\n` (NIP-5A: absolute paths, leading `/`)
5. Computes aggregate hash (SHA-256 of sorted concatenation of the `path`-tag lines)
6. Creates a kind 35129 manifest event with one `['path', '/abs/path', <sha256>]` tag per file, one aggregate `['x', <aggregateHash>, 'aggregate']` tag, and `requires` tags if configured
7. Signs with the test private key
8. Writes `.nip5a-manifest.json` to `dist/`
9. Updates the `napplet-aggregate-hash` meta tag in `dist/index.html`

## API Reference

### nip5aManifest(options)

Create a Vite plugin instance.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `Nip5aManifestOptions` | Plugin configuration |

**Returns:** `Plugin` (Vite plugin)

### Nip5aManifestOptions

```ts
interface Nip5aManifestOptions {
  /** Napplet type/dtag (e.g., 'feed', 'chat') */
  nappletType: string;

  /** Bare NAP domain requirements this napplet needs, optionally inferred from source usage. */
  requires?: string[] | {
    infer?: boolean;
    explicit?: string[];
    mode?: 'warn' | 'error';
  };

  /**
   * Human-readable title. Sets/overrides the built HTML `<title>` (plain HTML,
   * not a napplet-* meta). The napplet CLI emits it as the NIP-5A `["title", …]`
   * manifest tag at deploy.
   */
  title?: string;

  /**
   * Human-readable description. Sets/overrides the built HTML
   * `<meta name="description">` (plain HTML, not a napplet-* meta). The napplet
   * CLI emits it as the NIP-5A `["description", …]` manifest tag at deploy.
   */
  description?: string;

  /**
   * Artifact output contract. Defaults to 'external-assets'. Set to
   * 'single-file' to inline local JS/CSS build assets into index.html before
   * NIP-5A aggregateHash and manifest generation.
   */
  artifactMode?: 'external-assets' | 'single-file';

  /**
   * JSON Schema (draft-07+) describing the napplet's config surface (NAP-CONFIG).
   * May be an inline object or a path string (resolved relative to the Vite
   * project root). Falls through to `config.schema.json` then `napplet.config.*`
   * discovery when omitted.
   */
  configSchema?: NappletConfigSchema | string;

  /**
   * One queryless intent contract per archetype tag. Optional event kinds are
   * serialized as trailing `kind:<number>` fields on that same tag.
   */
  archetypes?: Array<{
    slug: string;
    convention: string;
    eventKinds?: number[];
  }>;
}
```

## Protocol Reference

- [NAP-CONFIG spec (PR #13)](https://github.com/napplet/naps/pull/13) -- per-napplet declarative configuration
- [NAP-RESOURCE (drafts)](https://github.com/napplet/naps) — shell-owned byte fetching primitive for sandboxed napplets
- [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) -- Napplet-shell protocol specification
- [NIP-5A](https://github.com/nostr-protocol/nips/blob/master/5A.md) -- Nsite specification
- [Aggregate Hash PR](https://github.com/nostr-protocol/nips/pull/2287) -- NIP-5A aggregate hash extension (not yet merged)

## License

MIT
