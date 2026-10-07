# @napplet/vite-plugin

> Vite plugin for napplet local development that generates NIP-5A manifests for testing and deploy metadata handoff.

**This is a build tool, not a runtime dependency or deploy signer.** It writes the metadata sidecar that `napplet deploy` reads when constructing and signing production manifest events.

## Getting Started

### What This Plugin Does

At **build time**, the plugin:

1. Optionally rewrites local JS/CSS build assets into `index.html` when `artifactMode: 'single-file'` is enabled
2. Walks the final `dist/` artifact set and computes SHA-256 of each file
3. Computes the aggregate hash per the NIP-5A algorithm (over the `path` tags alone)
4. Creates a NIP-5D **kind 35129** named-napplet manifest template — NIP-5A tag schema: one `['path', '/abs/path', '<sha256>']` per file plus one aggregate `['x', '<aggregateHash>', 'aggregate']` tag
5. Writes `.nip5a-manifest.json` to `dist/`
6. Embeds an optional schema as a `['config', ...]` tag on the manifest (NOT folded into `aggregateHash` — the aggregate is `path` tags only, per NIP-5D §Identity)

The build-time sidecar supports local verification and carries build-owned metadata into `napplet deploy`. The deploy command constructs and signs the event that is published to relays; it does not publish the sidecar as-is.

### When to Use This

- You are building a napplet and testing locally with a shell implementation
- You want to verify aggregate hash computation before deploying
- You want `napplet deploy` to preserve build-owned `requires`, `config`, and `archetype` metadata

### When NOT to Use This

- Signing or publishing manifest events directly (use `napplet deploy`)
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

- Used as the `d` tag in the kind 35129 manifest event

#### requires (optional)

**Type:** `string[] | { infer?: boolean; explicit?: string[]; mode?: 'warn' | 'error' }`

An array of bare NAP domain names this napplet requires from its host shell (e.g., `['outbox', 'storage']`), or an opt-in inference config. When set:

- Adds `['requires', 'domain']` tags to the kind 35129 manifest event
- Emits explicit domains as declared, including ones the plugin does not know yet (a drafted or runtime-specific NAP), with a build warning; the shell decides at load whether it provides each domain

With inference enabled, the plugin scans statically visible source usage of `@napplet/nap/<domain>`, SDK domain subpath imports, and direct `window.napplet.<domain>` access. Explicit requirements remain the author-controlled declaration; inferred domains are merged as tooling assistance and can warn or fail when explicit config is missing a domain.

If the shell does not support all required domains, the napplet can detect this at runtime via `window.napplet?.domain` presence or the shell can show a compatibility warning.

#### title (optional)

**Type:** `string`

Human-readable napplet title. When set, the plugin **sets/overrides** the built HTML `<title>` element (inserting one after `<head>` if the document has none), replacing any author-written title. This is **plain HTML** — NOT a `napplet-*` protocol meta tag. When omitted, the author's existing `<title>` is left untouched and no empty tag is emitted.

The injected value is HTML-escaped for element-text context (`&`, `<`, `>`). At deploy time the napplet CLI reads this back out of the built `index.html` and emits it as the NIP-5A `["title", …]` manifest tag.

#### description (optional)

**Type:** `string`

Human-readable napplet description. When set, the plugin **sets/overrides** the built HTML `<meta name="description">` element (inserting one after `<head>` if absent), replacing any existing description meta. This is **plain HTML** — NOT a `napplet-*` protocol meta tag. When omitted, the author's existing description meta is left untouched and no empty tag is emitted.

The injected value is HTML-escaped for attribute context (`&`, `"`). At deploy time the napplet CLI reads this back out of the built `index.html` and emits it as the NIP-5A `["description", …]` manifest tag.

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

If none of the three paths resolve a schema, manifest emission for the config tag is skipped silently.

#### archetypes (optional)

**Type:** `Array<{ slug: string; convention: string }>`

Declares the NAAT archetype roles this napplet fulfills ([living archetype registry](https://github.com/napplet/naps/blob/master/ARCHETYPES.md)). Each entry emits **one** `['archetype', slug, convention]` tag on the kind 35129 manifest event. `convention` is a queryless stable identity. The role slug and the convention's own archetype segment are independent, as defined by [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md). A napplet may declare several archetype roles; a napplet with no archetype tag is fully valid.

```ts
nip5aManifest({
  nappletType: 'my-feed',
  archetypes: [
    { slug: 'note', convention: 'napplet:note/open' },
    { slug: 'profile', convention: 'napplet:profile/open' },
  ],
});
// → emits ['archetype', 'note', 'napplet:note/open']
// → emits ['archetype', 'profile', 'napplet:profile/open']
```

Like the `config` tag, archetype tags are **not** folded into `aggregateHash`: per NIP-5D §Identity the aggregate is the NIP-5A hash of the `path` tags alone, so declaring archetypes never changes the napplet's content address. Blank slugs are skipped.

One object always represents one convention contract; repeat objects for several conventions. The plugin rejects query-bearing metadata and does not define a payload schema or infer an event kind from payload content. This non-normative guide follows [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md), [the archetype registry](https://github.com/napplet/naps/blob/master/ARCHETYPES.md), and [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md).

#### artifactMode (optional, v1.11+)

**Type:** `'external-assets' | 'single-file'` **Default:** `'external-assets'`

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

If set, the plugin signs the manifest event at build time. If not set, it writes the unsigned manifest template, including `requires`, `config`, and `archetype` metadata, for verification and `napplet deploy` to consume.

**Security:** NEVER use a real private key here. Use a dedicated test key generated for local development only:

```bash
# Generate a test key (using nostr-tools or similar)
node -e "import('nostr-tools/pure').then(m => console.log(Buffer.from(m.generateSecretKey()).toString('hex')))"
```

## NAP Domain Requirements

Use the `requires` option when your napplet needs specific NAP domains to function correctly.

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

Inference can be enabled when you want the plugin to check source usage against the explicit declaration:

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

### Manifest capability declaration

With `requires: ['outbox', 'storage']`, the signed manifest event includes the corresponding `requires` tags:

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

The host shell reads the signed manifest `requires` tags during napplet initialization and compares them against its supported NAP domains. Napplets can also check at runtime:

```ts
if (!window.napplet?.outbox) {
  console.warn('OUTBOX NAP not available — feed disabled');
}
```

## Build-Time Diagnostics

v0.29.0 adds a build-time safeguard enforced in `closeBundle` so misconfiguration fails loud before `dist/` reaches a shell.

### Inline scripts are supported (and expected)

Per NIP-5D a napplet is a single self-contained `/index.html` loaded via `iframe.srcdoc` with `sandbox="allow-scripts"` and no `allow-same-origin` — an opaque origin with no served URL. Its executable JS therefore lives **inline**; there is no origin from which the runtime could fetch an external `<script src>`. The plugin does **not** reject inline `<script>` elements. (An earlier version did under a loading model that NIP-5D does not define; that was removed — see napplet/web#53.)

When `artifactMode: 'single-file'` is set, the plugin additionally folds any local `<script src>`/`<link rel="stylesheet">` build assets into `index.html` and deletes them, so the single file is the only served artifact. Pre-existing inline scripts in your built HTML are preserved verbatim.

## How It Works

### HTML transforms (`transformIndexHtml`)

The plugin leaves protocol metadata out of `index.html`. Its only HTML transforms are the optional plain `<title>` and `<meta name="description">` values.

The shell resolves napplet identity and capability metadata from the signed manifest event, not from `index.html` protocol meta tags.

### Build Mode (`closeBundle`)

Runs after every build; `VITE_DEV_PRIVKEY_HEX` controls only whether the generated manifest is signed:

1. If `artifactMode: 'single-file'` is set, rewrites local JS/CSS references into `index.html` before hashing
2. Walks `dist/` directory recursively
3. Computes SHA-256 hash of each file's contents
4. Creates sorted hash lines: `<sha256hex> <absolutePath>\n` (NIP-5A: absolute paths, leading `/`)
5. Computes aggregate hash (SHA-256 of sorted concatenation of the `path`-tag lines)
6. Creates a kind 35129 manifest event with one `['path', '/abs/path', <sha256>]` tag per file, one aggregate `['x', <aggregateHash>, 'aggregate']` tag, and `requires` tags if configured
7. Signs with the test private key when `VITE_DEV_PRIVKEY_HEX` is set; otherwise keeps the template unsigned
8. Writes `.nip5a-manifest.json` to `dist/`

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
   * One queryless intent convention per archetype tag.
   */
  archetypes?: Array<{
    slug: string;
    convention: string;
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
