# @napplet/vite-plugin

Vite build integration for current NIP-5D manifests. This package is a development dependency; shells provide the runtime namespace.

This is non-normative package guidance. [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) defines event format and loading; [NAPs](https://github.com/napplet/naps) define capability contracts.

## Install and configure

```sh
pnpm add -D @napplet/vite-plugin
```

```ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [nip5aManifest({
    nappletType: 'notes',
    title: 'Notes',
    description: 'Read and write personal notes',
    requires: ['outbox', 'storage'],
    optional: ['theme'],
    archetypes: [{ slug: 'note', convention: 'napplet:note/open', params: ['id'] }],
    artifactMode: 'single-file',
  })],
});
```

`nip5aManifest` and `.nip5a-manifest.json` retain their existing names for package and tool compatibility. Their output is a NIP-5D manifest, not an nsite manifest. From **0.15.0**, the output uses the direct artifact hash; **0.14.x and earlier** generated legacy path/aggregate events.

## Build output

The default `single-file` mode inlines local JS/CSS into `index.html`. After rewriting, the plugin hashes the final artifact bytes and writes a kind `35129` event template. Its single `x` tag is that SHA-256, and `content` is the description. No `path` tags or aggregate hash are emitted. Metadata does not participate in the artifact hash. The hash is never injected back into the bytes it covers.

Set `description`, or supply an ordinary HTML `<meta name="description" content="…">`. A missing or empty description fails manifest generation because NIP-5D §Manifest requires non-empty content. `title` and `description` options also update their ordinary HTML counterparts. These are authoring conveniences, not protocol `napplet-*` meta tags.

Without `VITE_DEV_PRIVKEY_HEX`, the sidecar is unsigned. With a development key, it contains a signed event. `artifactHash` is local sidecar metadata, not a Nostr tag. Use `napplet deploy` for production signing, Blossom upload and relay publication; it builds fresh events from the artifact and metadata.

## Options

| Option | Behavior |
| --- | --- |
| `nappletType: string` | Named-event `d` identifier. |
| `description?: string` | Plain-text event content; falls back to HTML description metadata. |
| `title?: string` | Optional display title and HTML title override. |
| `requires?: string[]` | Required domains, serialized as `R` tags. |
| `requires?: { infer?, explicit?, mode? }` | Opt-in inference from static SDK/NAP imports and direct namespace access. `mode` is `warn` or `error` for missing explicit declarations. |
| `optional?: string[]` | Optional integrations, serialized as `O` tags and excluded from inferred required domains. |
| `archetypes?: Array<{ slug, convention, params? }>` | Existing ergonomic option; emits independent `z` role and `i` intent tags. `params` names advertised intent parameters. |
| `intents?: Array<{ intent, params? }>` | Advertise intents without coupling them to a role option. |
| `source?: string` | Source URL metadata. |
| `servers?: string[]` | Blossom server hints. |
| `icon?: { sha256, mimeType }` | Optional content-addressed icon; upload the matching PNG, JPEG or WebP blob separately. |
| `configSchema?: NappletConfigSchema \| string` | Inline NAP-CONFIG schema or project-relative schema file. Discovery falls back to `config.schema.json`, then `napplet.config.ts`/`.js`/`.mjs`. |
| `artifactMode?: 'single-file' \| 'external-assets'` | `single-file` is the default. The explicit external-assets option preserves Vite output for existing tooling; external runtime assets need rebundling before deployment as a self-contained napplet. External-assets builds warn that the manifest `x` hash covers only `index.html` and list the remaining local assets. Builds without `dist/index.html` fail with a `[nip5a-manifest]` error. |

Known-domain inference is best effort. Explicit required domains are retained with a build warning when absent from this package's registry; they still need a published NAP contract and support from the target shell. An `R` or `O` declaration never grants authority. Runtime code checks `window.napplet?.<domain>` and handles missing domains.

Config schema discovery and validation remain package features. A resolved schema is carried in its NAP-defined `config` tag and is not folded into `x`. See the [NAP track](https://github.com/napplet/naps) for schema semantics.

```ts
nip5aManifest({
  nappletType: 'notes',
  description: 'Read and write notes',
  requires: { infer: true, explicit: ['outbox', 'storage'], mode: 'warn' },
  optional: ['theme'],
});
```

## Migration

New builds emit only the current schema. For a legacy-only shell, use CLI 0.7.0+ with `napplet deploy --format legacy` during the compatibility window. That serializer is isolated in the CLI and can be removed without changing current readers. Existing immutable event pointers and shell ACL/storage keys need separate rollout planning; rebuilding does not migrate saved data.

See the [event migration guide](https://napplet.run/docs/guide/event-migration).
