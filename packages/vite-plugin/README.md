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
3. Computes the aggregate hash per the NIP-5A algorithm
4. Creates a kind 35128 manifest event and signs it
5. Writes `.nip5a-manifest.json` to `dist/`
6. Updates the meta tag in `dist/index.html` with the computed hash
7. Injects `<meta name="napplet-config-schema">` into `dist/index.html` if a `configSchema` is declared or discovered
8. Embeds the schema as a `['config', ...]` tag on the kind 35128 manifest
9. Includes the schema bytes in `aggregateHash` via a synthetic `config:schema` path prefix

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
- Used as the `d` tag in the kind 35128 manifest event

#### requires (optional)

**Type:** `string[]`

An array of service names this napplet requires from its host shell (e.g., `['audio', 'notifications']`). When set:

- Injects a `<meta name="napplet-requires">` tag into HTML (comma-separated service names)
- Adds `['requires', 'service-name']` tags to the kind 35128 manifest event

If the shell does not support all required capabilities, the napplet can detect this at runtime via `window.napplet.shell.supports()` or the shell can show a compatibility warning.

#### configSchema (optional)

**Type:** `NappletConfigSchema | string | undefined`

Declares a JSON Schema (draft-07+) describing the napplet's per-napplet configuration surface (NAP-CONFIG). At build time, the plugin:

- Validates the schema against the NAP-CONFIG Core Subset (see Build-Time Guards below)
- Embeds the schema as a `['config', JSON.stringify(schema)]` tag on the kind 35128 manifest event
- Includes the schema bytes in `aggregateHash` via a synthetic `config:schema` path prefix (any schema edit bumps the hash)
- Injects `<meta name="napplet-config-schema" content="{json}">` into `dist/index.html` so the napplet's shim can read it synchronously at install time

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
- The resulting `index.html` artifact bytes are used for the real `['x', <sha256>, 'index.html']` manifest tag and aggregateHash input.
- The aggregate hash is computed after inlining and before the self-referential aggregate-hash meta stamp is replaced.
- `config:schema` and `connect:origins` synthetic inputs continue to participate in aggregateHash and remain excluded from public `['x', ...]` manifest tags.

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

#### strictCsp (deprecated in v0.29.0)

**Type:** `unknown` (accepted-but-warns)

As of v0.29.0, the shell is the sole runtime CSP authority — every napplet receives its Content-Security-Policy from the HTTP response header the shell serves with the napplet's HTML, not from a meta tag emitted by the build. The `strictCsp` option is therefore **deprecated and has no effect on the emitted HTML**.

For back-compat with pre-v0.29.0 `vite.config.ts` files, the option is still accepted at the type level (typed as `unknown`) and emits exactly one `console.warn` per build from `configResolved`:

```
[nip5a-manifest] `strictCsp` is deprecated and has no effect (v0.29.0+). The shell is now the sole runtime CSP authority. Remove this option from your vite.config.ts to silence this warning. Scheduled for hard-remove in a future milestone (REMOVE-STRICTCSP).
```

Migration:

- Drop the `strictCsp` key from your `vite.config.ts`. Napplets ship only the HTML + assets; the shell emits the CSP.
- If your napplet ships inline `<script>` elements (without `src`), fix them before v0.30.0 — the build now hard-fails on inline scripts to mirror the shell's baseline `script-src 'self'` posture. See [Build-Time Diagnostics](#build-time-diagnostics) below.
- If your napplet needs direct network access (previously implicit under a permissive dev CSP, now explicit), declare the origins via the new [`connect`](#connect-optional-v0290) option and let the shell prompt the user.

See [NAP-CLASS-2.md](https://github.com/napplet/naps) for the shell-side posture that replaces the old in-page strict-CSP baseline, and [`specs/SHELL-CONNECT-POLICY.md`](../../specs/SHELL-CONNECT-POLICY.md) for the deployer-side checklist covering HTTP-responder precondition, residual meta-CSP refusal, and grant-persistence key.

#### connect (optional, v0.29.0+)

**Type:** `string[]`

Declares the origins the napplet needs direct browser-level network access to (`fetch`, `WebSocket`, `SSE`, `EventSource`). Each origin is validated by the shared `normalizeConnectOrigin` function from `@napplet/nap/connect/types` (the single source of truth used by both the build tool and shell implementations), emitted as a `["connect", "<origin>"]` tag in the signed NIP-5A manifest, and folded into `aggregateHash` via a synthetic `connect:origins` xTag so any origin-list change auto-invalidates prior user grants keyed on `(dTag, aggregateHash)`.

**Quick start:**

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    nip5aManifest({
      nappletType: 'my-napplet',
      connect: [
        'https://api.example.com',
        'wss://events.example.com',
        'https://xn--caf-dma.example.com',   // café.example.com in Punycode
      ],
    }),
  ],
});
```

**Origin format (accept / reject rules):**

| Rule | Behaviour |
|------|-----------|
| Scheme | MUST be one of `https`, `wss`, `http`, `ws`. Closed set. Anything else rejected. |
| Lowercase | Scheme AND host MUST be lowercase on the wire. Uppercase anywhere rejected. |
| Host | ASCII DNS labels or already-Punycode IDN (`xn--…`). Non-Punycode non-ASCII rejected — use Punycode in the config string. |
| IPv4 literal | Accepted (including `127.0.0.1`, `10.x`, `192.168.x`, `172.16.x`). |
| IPv6 literal | Rejected in v1 (both bracketed `[::1]` and bare). |
| Port | Explicit non-default OK (e.g. `:8443`). Default port (`:443` on https/wss, `:80` on http/ws) MUST be omitted — explicit default-port forms rejected for aggregateHash determinism. |
| Path / query / fragment | Rejected. Origin = scheme + host + optional non-default port. `https://foo.com/api`, `https://foo.com?x=1`, `https://foo.com#x` all invalid. |
| Wildcard | Rejected. Each subdomain is a separate origin. |

Rejected inputs throw at `configResolved` with a diagnostic prefixed `[nip5a-manifest]`, failing the Vite build before `dist/` is written.

**Manifest tag emission:**

One `["connect", "<origin>"]` tag per origin, emitted in **author-declared order** (as supplied in the config array). Tags are placed between the existing `manifestXTags` (file hashes) and `configTags` (config schema) in the signed kind 35128 manifest event.

**aggregateHash fold:**

Origins are fed through a canonical fold procedure (lowercase → ASCII-ascending sort → LF-join with no trailing newline → UTF-8 → SHA-256 → lowercase hex) and the resulting digest is pushed as a synthetic xTag entry `[<hex-digest>, 'connect:origins']` into the manifest's xTag array BEFORE `computeAggregateHash`. The synthetic entry participates in `aggregateHash` but is filtered out of the public `['x', ...]` tag projection via a shared `SYNTHETIC_XTAG_PATHS` set (which also covers the v0.25.0 `config:schema` fold).

Any addition, removal, or reorder-after-normalization of the origin set produces a different `aggregateHash`, which auto-invalidates any prior user grant keyed on `(dTag, aggregateHash)` — guaranteeing the shell re-prompts on a supply-chain origin change.

**Module-load conformance guardrail:**

At ESM import time, the plugin self-checks its fold procedure against the normative NAP-CONNECT conformance fixture (3 origins → SHA-256 `cc7c1b1903fb23ecb909d2427e1dccd7d398a5c63dd65160edb0bb8b231aa742`). A drift in the fold procedure (even a one-byte change to the sort or separator) fires a fatal at plugin-import time, preventing the build from shipping a hash incompatible with shells.

**See also:**
- [NAP-CONNECT](https://github.com/napplet/naps) — normative spec (origin format, aggregateHash fold, conformance fixture)
- [`specs/SHELL-CONNECT-POLICY.md`](../../specs/SHELL-CONNECT-POLICY.md) — shell-deployer checklist (HTTP-responder precondition, residual meta-CSP refusal, grant persistence, consent prompt MUSTs, revocation UX)
- [NAP-CLASS-2.md](https://github.com/napplet/naps) — posture triggered by presence of `connect` tags (CSP shape, shell responsibilities at serve time)

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
  "kind": 35128,
  "tags": [
    ["d", "my-music-app"],
    ["x", "<sha256>", "index.js"],
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

v0.29.0 adds two build-time safeguards and one informational warning, all enforced in `closeBundle` or `configResolved` so misconfiguration fails loud before `dist/` reaches a shell.

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

### Cleartext origin warning (new in v0.29.0)

When `connect` contains any `http:` or `ws:` origin, the plugin emits one informational `console.log` during `configResolved` explaining browser mixed-content reality:

```
[nip5a-manifest] cleartext origin declared in `connect`: http://… / ws://…
HTTPS shells silently drop fetches to http: / ws: origins (except localhost / 127.0.0.1 secure-context exceptions). Approved grants will produce no traffic when the shell is served over https. Prefer https: / wss: end-to-end, or check shell.supports('connect:scheme:http') at runtime.
```

This is **informational, not an error** — operator policy may explicitly permit cleartext for localhost development or for explicit-opt-out-of-TLS deployments. Shells advertising `shell.supports('connect:scheme:http') === false` refuse cleartext entirely; check at runtime before depending on cleartext grants.

### Dev-mode-only `napplet-connect-requires` meta (new in v0.29.0)

In dev mode (`vite serve`), the plugin injects a `<meta name="napplet-connect-requires" content="<origins>">` tag into the served HTML's `<head>` when `connect` is non-empty. The `content` is the ASCII-sorted origin list, space-separated. This tag is useful for shell-less local-preview workflows that want to simulate a granted state without running a full shell.

**IMPORTANT:** The tag name is `napplet-connect-requires` — deliberately distinct from the shell-authoritative `napplet-connect-granted`, which is what the napplet shim reads at install time and is injected ONLY by a real shell at HTTP-serve time on grant approval. The plugin MUST NEVER emit `napplet-connect-granted`; the plugin has no authority to represent a user's consent decision.

The `-requires` tag is NOT injected in production builds (`vite build`). Production HTML contains neither tag; grants flow through the shell's HTTP response at serve time.

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
4. Creates sorted hash lines: `<sha256hex> <relativePath>\n`
5. Computes aggregate hash (SHA-256 of sorted concatenation)
6. Creates kind 35128 manifest event with `x` tags for each file and `requires` tags if configured
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

  /**
   * Origins the napplet needs direct browser-level network access to (v0.29.0+).
   * Each origin validated via `normalizeConnectOrigin` from
   * `@napplet/nap/connect/types`, emitted as `["connect", "<origin>"]`
   * manifest tags, folded into `aggregateHash` via a synthetic `connect:origins`
   * xTag so any origin change auto-invalidates prior grants.
   * See NAP-CONNECT for the authoritative origin format.
   */
  connect?: string[];

  /**
   * @deprecated v0.29.0: The shell is now the sole runtime CSP authority.
   * This option is accepted-but-warns (one console.warn per build) and has
   * NO effect on the emitted HTML. Scheduled for hard-remove in v0.30.0
   * (REMOVE-STRICTCSP). Remove this key from vite.config.ts to silence.
   */
  strictCsp?: unknown;
}
```

## Protocol Reference

- [NAP-CONFIG spec (PR #13)](https://github.com/napplet/naps/pull/13) -- per-napplet declarative configuration
- [NAP-RESOURCE (drafts)](https://github.com/napplet/naps) — sandboxed byte fetching primitive that strict CSP enforces against
- [NAP-CONNECT (drafts)](https://github.com/napplet/naps) -- user-gated direct network access: origin format, manifest tag shape, canonical `connect:origins` aggregateHash fold, runtime API
- [NAP-CLASS (drafts)](https://github.com/napplet/naps) + [`NAP-CLASS-1.md`](https://github.com/napplet/naps) + [`NAP-CLASS-2.md`](https://github.com/napplet/naps) -- napplet class track and the two v0.29.0 posture members (strict baseline + user-approved explicit-origin)
- [`specs/SHELL-CONNECT-POLICY.md`](../../specs/SHELL-CONNECT-POLICY.md) + [`specs/SHELL-CLASS-POLICY.md`](../../specs/SHELL-CLASS-POLICY.md) -- shell-deployer checklists
- [NIP-5D](../../specs/NIP-5D.md) -- Napplet-shell protocol specification
- [NIP-5A](https://github.com/nostr-protocol/nips/blob/master/5A.md) -- Nsite specification
- [Aggregate Hash PR](https://github.com/nostr-protocol/nips/pull/2287) -- NIP-5A aggregate hash extension (not yet merged)

## License

MIT
