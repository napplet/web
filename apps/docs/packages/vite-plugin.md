# @napplet/vite-plugin

> Vite plugin for napplet local development that generates NIP-5A manifests for testing.

`@napplet/vite-plugin` is a **development tool**. At build time (with a test private key) it
walks `dist/`, computes per-file SHA-256 hashes and the NIP-5A aggregate hash,
signs a NIP-5D **kind 35129** named-napplet manifest event (NIP-5A tag schema:
`path` tags + one aggregate `x` tag), and emits the `requires` / `config`
tags. It runs at build/dev time only — it is **not** a runtime
dependency.

::: tip
For production deployment of napplets to nsites, use community deploy tools like
[nsyte](https://github.com/nicefarm/nsyte), which handle NIP-5A event creation and
relay publishing. The build-time manifest here is for verifying the hash workflow
locally.
:::

- **npm:** [`@napplet/vite-plugin`](https://www.npmjs.com/package/@napplet/vite-plugin)
- **JSR:** [`@napplet/vite-plugin`](https://jsr.io/@napplet/vite-plugin)
- **Source:** [packages/vite-plugin](https://github.com/napplet/napplet/tree/main/packages/vite-plugin)

## Install

```bash
npm install -D @napplet/vite-plugin
```

## Quick start

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [nip5aManifest({ nappletType: 'my-napp' })],
});
```

## Options

`nip5aManifest(options)` returns a Vite `Plugin`. The options:

| Option | Type | Purpose |
| --- | --- | --- |
| `nappletType` *(required)* | `string` | The napp type / manifest `d` tag. |
| `requires` | `string[]` | Bare NAP domain names this napplet needs, such as `outbox` or `storage`. Emits `["requires", …]` manifest tags. |
| `title` | `string` | Human-readable title. Sets/overrides the built HTML `<title>` (plain HTML, not a `napplet-*` meta; untouched when omitted). The napplet CLI reads it back out of the built `index.html` and emits the NIP-5A `["title", …]` manifest tag. |
| `description` | `string` | Human-readable description. Sets/overrides the built HTML `<meta name="description">` (plain HTML, not a `napplet-*` meta; untouched when omitted). The napplet CLI reads it back out and emits the NIP-5A `["description", …]` manifest tag. |
| `configSchema` | `NappletConfigSchema \| string` | A JSON Schema (draft-07+) for the napplet's NAP-CONFIG surface. Inline object or path; falls through to `config.schema.json` then `napplet.config.*` discovery. |
| `artifactMode` | `'external-assets' \| 'single-file'` | Default `'external-assets'`. `'single-file'` inlines local JS/CSS into `index.html` before hashing — for gateway-portable NIP-5A artifacts. |

## Generated manifest

At **build time** (with `VITE_DEV_PRIVKEY_HEX` set), the plugin walks `dist/`,
computes hashes, signs the kind 35129 event, and writes `.nip5a-manifest.json`:

```json
{
  "kind": 35129,
  "tags": [
    ["d", "my-music-app"],
    ["path", "/index.html", "<sha256>"],
    ["x", "<aggregateHash>", "aggregate"],
    ["requires", "outbox"],
    ["requires", "storage"]
  ]
}
```

## Build-time guards & diagnostics

- **Config schema validation** — the resolved schema is checked against the
  NAP-CONFIG Core Subset; `pattern`, `$ref`, a non-object root, or a
  `x-napplet-secret` with a `default` abort the build.
- **Inline scripts are supported** — NIP-5D loads a napplet as a single
  self-contained `/index.html` via `iframe.srcdoc` (opaque origin), so its JS is
  inline by design. The plugin does not reject inline `<script>` elements. With
  `artifactMode: 'single-file'` it folds local script/style assets into the HTML
  and leaves any pre-existing inline scripts intact.

## Environment

- **`VITE_DEV_PRIVKEY_HEX`** — hex-encoded 32-byte test private key. If set, the
  plugin signs the manifest at build time; if unset, manifest generation is
  gracefully skipped. **Never use a real key** — generate a dedicated test key.

## See also

- [NIP-5D explained](/guide/nip-5d) — manifest & NAP negotiation
- [Core concepts](/guide/concepts#acl-capabilities) — how the aggregate hash keys ACL
