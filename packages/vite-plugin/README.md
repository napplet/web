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

The default `single-file` mode inlines local JS/CSS into `index.html`. After rewriting, the plugin hashes the final artifact bytes and writes a kind `35129` event template. Its single `x` tag is that SHA-256, and `content` is the description. No `path` tags or aggregate hash are emitted. Embedded metadata is part of those artifact bytes and therefore changes the hash when edited. The hash is never injected back into the bytes it covers.

Set `description`, or supply an ordinary HTML `<meta name="description" content="…">`. A missing or empty description fails manifest generation because NIP-5D §Manifest requires non-empty content. `title` and `description` options update their HTML counterparts. The plugin also embeds the applicable publishing metadata described below before computing `x`.

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
| `icon?: { data?, sha256?, mimeType }` | Supply PNG, JPEG or WebP bytes as `Uint8Array` to embed an icon and derive its hash. Hash-only input remains supported; upload that blob separately. |
| `screenshots?: Array<{ data?, sha256?, mimeType?, dim?, size?, alt? }>` | `screenshot` tags in display order. Bytes are hashed, sized, format-sniffed and measured; hash-only entries are emitted as given. See [Presentation media](#presentation-media-and-source-pins). |
| `preview?: { data?, sha256?, mimeType?, dim?, size?, duration?, alt? }` | The single `preview` video tag (WebM or MP4 bytes, or a hash). |
| `sourceCommit?: string` | Full lowercase-hex Git commit ID emitted as `source-commit`; clients ignore it without a repository `source`. |
| `sourceArchive?: { url, sha256, mimeType }` | Independently downloadable source archive emitted as `source-archive` (HTTPS URL without credentials or fragment). |
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

## Recoverable HTML metadata

This is a non-normative description of the plugin's implementation of [NIP-5D, HTML Metadata for Publishing](https://github.com/nostr-protocol/nips/pull/2303). The living specification defines the mappings and remains authoritative. Embedding supplies publishing hints; it is not a runtime requirement and does not grant capabilities or override a signed manifest.

The final head contains the resolved title, description, named identifier, archetypes, accepted intents and advertised parameter names, required/optional domains, source URL, Blossom hints, and an icon data URL when image bytes are available. Screenshot, preview, `source-commit` and `source-archive` tags have no head mapping and stay in the sidecar. The plugin emits named events (`35129`), so it removes snapshot-only `napplet-parent` and `napplet-root` declarations. It never inserts the artifact hash or event signing fields into HTML.

Explicit options replace the corresponding author head declarations; an omitted option falls back to the head. `nappletType` remains required and controls the identifier. Explicit `archetypes` replaces author archetype and intent declarations with its roles and conventions; `intents` adds standalone advertisements. Without `archetypes`, explicit `intents` replaces just the author intent declarations. Empty arrays clear a category. `requires: { infer: true, explicit: [...] }` combines the configured list with inferred domains; `optional` wins overlaps. The first author singleton is used, repeated declarations are deduplicated, and all owned head elements are replaced once. Scripts, comments, templates, body content, and unrelated head elements are preserved. Metadata inside scripts, comments, templates, or the body is not read as a declaration.

For a recoverable icon, provide bytes:

```ts
import { readFileSync } from 'node:fs'

nip5aManifest({
  nappletType: 'notes',
  description: 'Read and write notes',
  icon: {
    data: readFileSync(new URL('./icon.png', import.meta.url)),
    mimeType: 'image/png',
  },
})
```

The hash covers decoded image bytes, not the data URL. If `sha256` is supplied alongside `data`, it is checked against those bytes. An existing supported head icon data URL can supply the bytes instead. Hash-only input retains its manifest tag; when no matching head image exists the plugin warns and omits the HTML icon, because a hash cannot recover an image. Unsupported, remote, empty, or malformed author icon URLs supply no embedded icon. Consumers still verify image decoding before display as specified by NIP-5D.

Metadata and JS/CSS inlining finish before the plugin hashes `index.html`. Changing an embedded declaration or icon changes the artifact hash. The NAP-CONFIG schema remains in the sidecar: NIP-5D defines no HTML mapping for that extension. `napplet deploy` can recover the specified publishing fields and icon bytes from the built HTML without the sidecar.

## Presentation media and source pins

[NIP-5D §Presentation media](https://github.com/nostr-protocol/nips/pull/2303) lets a manifest carry any number of `screenshot` tags and at most one `preview` video, each described by NIP-92 `key value` fields: one `x` sha256 of the complete bytes plus optional `m`, `dim`, `size`, `alt` and, for previews, `duration`. §Source adds an optional `source-commit` pin and an optional `source-archive`. The specification defines no HTML head mapping for these tags, so the plugin writes them only to the `.nip5a-manifest.json` template and never into `index.html`; adding media does not change the artifact hash.

```ts
import { readFileSync } from 'node:fs'

nip5aManifest({
  nappletType: 'notes',
  description: 'Read and write notes',
  source: 'https://github.com/example/notes',
  sourceCommit: '0123456789abcdef0123456789abcdef01234567',
  screenshots: [
    { data: readFileSync(new URL('./shots/board.png', import.meta.url)), alt: 'The notes board' },
    { sha256: 'ae7a…c75a', mimeType: 'image/webp', dim: '1200x750' },
  ],
  preview: { data: readFileSync(new URL('./shots/demo.webm', import.meta.url)), dim: '960x600', duration: 8.5 },
})
```

With `data`, the plugin derives `x` and `size`, sniffs the format for `m` (PNG, JPEG or WebP for screenshots; WebM or MP4 for the preview), and reads `dim` from PNG, JPEG and WebP headers. A declared `sha256`, `mimeType`, `size` or `dim` must agree with the bytes or the build fails. Each supplied blob is written to `dist/<sha256>.<ext>` after `index.html` is hashed so deploy tooling can upload it to the declared Blossom servers; `napplet deploy` uploads blobs referenced by these tags. Hash-only entries keep their tag and need the blob uploaded separately. Because the specification says publishers SHOULD include `m` and `dim`, omitting them produces a build warning. `sourceCommit` without a `source` is still emitted but warns, since clients ignore a pin without a repository source; `sourceArchive` is validated for shape only. Clients verify hashes and decoding before display as specified by NIP-5D; declaring media does not grant anything.

### GAMEPAD integration

Requirement inference recognizes `@napplet/nap/gamepad`, `@napplet/sdk/gamepad`, and direct GAMEPAD domain reads. Declare `optional: ["gamepad"]` when keyboard or pointer controls fulfill the core task. See the proposed [NAP-GAMEPAD](https://github.com/napplet/naps/pull/108).

### Navigation declarations

The requirement scanner recognizes `@napplet/sdk/navigation`, `@napplet/nap/navigation` subpaths, and direct `window.napplet.navigation` access. Declare `intent` explicitly alongside `navigation` when using the [NAP-NAVIGATION draft](https://github.com/napplet/naps/pull/126); inference does not grant or automatically add dependencies. For optional shell history, declare both in `optional` and guard both domain objects. Advertise each retained location's convention and parameter names with `archetypes` / `intents`; parameter names allow history retention without defining payload value schemas. See the [navigation guide](../../apps/docs/naps/navigation.md).
