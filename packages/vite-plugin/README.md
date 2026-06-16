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

**Type:** `string[]`

An array of service names this napplet requires from its host shell (e.g., `['audio', 'notifications']`). When set:

- Injects a `<meta name="napplet-requires">` tag into HTML (comma-separated service names)
- Adds `['requires', 'service-name']` tags to the kind 35129 manifest event

If the shell does not support all required capabilities, the napplet can detect this at runtime via `window.napplet.shell.supports()` or the shell can show a compatibility warning.

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

#### artifactMode (optional, v1.11+)

**Type:** `'external-assets' | 'single-file'`
**Default:** `'external-assets'`

Controls the build artifact shape the plugin validates and hashes.

| Value | Behaviour |
|-------|-----------|
| `'external-assets'` | Preserve Vite's default `index.html` + JS/CSS asset graph. Inline executable scripts are rejected. |
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

- The plugin first rejects any inline executable scripts already present in the built HTML.
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

## Service Dependencies

Use the `requires` option when your napplet needs specific shell capabilities (like audio playback or push notifications) to function correctly.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    nip5aManifest({
      nappletType: 'my-music-app',
      requires: ['audio', 'notifications'],
    }),
  ],
});
```

### What gets injected

With `requires: ['audio', 'notifications']`, the plugin injects into your HTML `<head>`:

```html
<meta name="napplet-aggregate-hash" content="">
<meta name="napplet-napp-type" content="my-music-app">
<meta name="napplet-requires" content="audio,notifications">
```

At build time (with `VITE_DEV_PRIVKEY_HEX` set), the manifest event also includes `requires` tags:

```json
{
  "kind": 35129,
  "tags": [
    ["d", "my-music-app"],
    ["path", "/index.html", "<sha256>"],
    ["x", "<aggregateHash>", "aggregate"],
    ["requires", "audio"],
    ["requires", "notifications"]
  ]
}
```

### Runtime compatibility checking

The host shell reads `<meta name="napplet-requires">` during napplet initialization and compares against its supported capabilities. Napplets can also check at runtime:

```ts
import '@napplet/shim';

if (!window.napplet.shell.supports('media')) {
  console.warn('Media NAP not available — some features disabled');
}
```

## Build-Time Diagnostics

v0.29.0 adds a build-time safeguard enforced in `closeBundle` so misconfiguration fails loud before `dist/` reaches a shell.

### Inline-script fail-loud (new in v0.29.0; mode-aware in v1.11)

The plugin scans `dist/index.html` after build for any `<script>` element without a non-empty `src` attribute. Such elements are hard-errors — the build throws and exits non-zero with a diagnostic referencing the shell's baseline `script-src 'self'` posture.

Allowed script variants (not flagged):
- `<script src="..."></script>` — external module
- `<script type="application/json">…</script>` — JSON data island
- `<script type="application/ld+json">…</script>` — JSON-LD data island
- `<script type="importmap">…</script>` — import map
- `<script type="speculationrules">…</script>` — speculation rules
- HTML comments (stripped before scan)

Rejected:
- `<script>console.log("hi")</script>` — inline JS without `src`
- `<script type="module">/* inline */</script>` — inline module

**Why:** The shell is now the sole runtime CSP authority. Every conformant shell serves napplet HTML with a CSP that includes `script-src 'self'` (or tighter, via `'nonce-…'`). Inline `<script>` without `src` violates that policy, so shipping inline JS guarantees the napplet will be partially non-functional at runtime. Surfacing this at build time converts a silent runtime failure into a loud build failure.

Exception: when `artifactMode: 'single-file'` is set, the plugin validates the pre-inline HTML first, then creates the inline module scripts itself from local build assets. Those build-produced inline scripts are intentional and are accepted as part of the explicit single-file NIP-5A artifact contract.

**Fixing:** Move inline JS into a `.js` module under `src/` and import it. For build-time state that needs to reach runtime code (feature flags, config defaults), use a `<script type="application/json" id="data">…</script>` data island and read it at runtime via `document.getElementById('data').textContent`.

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

  /** Service dependencies this napplet requires (e.g., ['audio', 'notifications']). Optional. */
  requires?: string[];

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
}
```

## Protocol Reference

- [NAP-CONFIG spec (PR #13)](https://github.com/napplet/naps/pull/13) -- per-napplet declarative configuration
- [NAP-RESOURCE (drafts)](https://github.com/napplet/naps) — sandboxed byte fetching primitive that strict CSP enforces against
- [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) -- Napplet-shell protocol specification
- [NIP-5A](https://github.com/nostr-protocol/nips/blob/master/5A.md) -- Nsite specification
- [Aggregate Hash PR](https://github.com/nostr-protocol/nips/pull/2287) -- NIP-5A aggregate hash extension (not yet merged)

## License

MIT
