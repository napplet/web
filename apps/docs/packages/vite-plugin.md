# @napplet/vite-plugin

> Vite plugin for napplet local development — injects aggregate-hash meta tags and
> generates NIP-5A manifests for testing.

`@napplet/vite-plugin` is a **development tool**. In dev mode it injects the
discovery meta tags the shim looks for; at build time (with a test private key) it
walks `dist/`, computes per-file SHA-256 hashes and the NIP-5A aggregate hash,
signs a NIP-5D **kind 35129** named-napplet manifest event (NIP-5A tag schema:
`path` tags + one aggregate `x` tag), and emits the `requires` / `connect` /
`config` tags. It runs at build/dev time only — it is **not** a runtime
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
| `nappletType` *(required)* | `string` | The napp type / `d` tag; injected as `<meta name="napplet-napp-type">` and used as the manifest `d` tag. |
| `requires` | `string[]` | Service names this napplet needs. Injects a `napplet-requires` meta tag and `["requires", …]` manifest tags. |
| `configSchema` | `NappletConfigSchema \| string` | A JSON Schema (draft-07+) for the napplet's NAP-CONFIG surface. Inline object or path; falls through to `config.schema.json` then `napplet.config.*` discovery. |
| `artifactMode` | `'external-assets' \| 'single-file'` | Default `'external-assets'`. `'single-file'` inlines local JS/CSS into `index.html` before hashing — for gateway-portable NIP-5A artifacts. |
| `connect` | `string[]` | Origins the napplet needs direct network access to. Validated and emitted as `["connect", …]` manifest tags. Not folded into the aggregate hash (NIP-5D §Identity: the aggregate is the `path` tags alone); a shell keys grant invalidation on the `connect` tags. |
| `strictCsp` | `unknown` | **Deprecated (v0.29.0).** Accepted-but-warns, no effect — the shell is now the sole runtime CSP authority. |

## What gets injected

In **dev mode**, two meta tags so the shim can find them:

```html
<meta name="napplet-aggregate-hash" content="">
<meta name="napplet-napp-type" content="my-napp">
```

At **build time** (with `VITE_DEV_PRIVKEY_HEX` set), the plugin walks `dist/`,
computes hashes, signs the kind 35129 event, writes `.nip5a-manifest.json`, and
stamps the real aggregate hash into the meta tag:

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

## Build-time guards & diagnostics

- **Config schema validation** — the resolved schema is checked against the
  NAP-CONFIG Core Subset; `pattern`, `$ref`, a non-object root, or a
  `x-napplet-secret` with a `default` abort the build.
- **Inline-script fail-loud** — any `<script>` without a non-empty `src` in
  `dist/index.html` is a hard error (mirrors the shell's `script-src 'self'`
  baseline). JSON / JSON-LD / importmap / speculationrules data islands are
  allowed.
- **Cleartext-origin warning** — declaring an `http:` / `ws:` origin in `connect`
  logs an informational note about browser mixed-content reality.

## Environment

- **`VITE_DEV_PRIVKEY_HEX`** — hex-encoded 32-byte test private key. If set, the
  plugin signs the manifest at build time; if unset, manifest generation is
  gracefully skipped. **Never use a real key** — generate a dedicated test key.

## See also

- [NIP-5D explained](/guide/nip-5d) — manifest & NAP negotiation
- [Core concepts](/guide/concepts#acl-capabilities) — how the aggregate hash keys ACL
