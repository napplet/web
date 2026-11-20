# Migrating NIP-5D events

This is non-normative migration guidance for the `@napplet` packages. The living [NIP-5D Manifest and Identity sections](https://github.com/dskvr/nips/blob/nip/5d/5D.md#manifest), through [PR #2303](https://github.com/nostr-protocol/nips/pull/2303), remain authoritative. Consult the [NAP track](https://github.com/napplet/naps) for domain operations.

## Release cutoff

Packages have independent versions. The following releases switch their default writer or reader to the artifact-hash schema:

| Package | Last legacy default series | First current-schema release |
| --- | --- | --- |
| `@napplet/cli` | `0.6.x` | `0.7.0` (legacy output removed in `0.15.0`) |
| `@napplet/vite-plugin` | `0.14.x` | `0.15.0` |
| `@napplet/conformance` | `0.17.x` | `0.18.0` |
| `@napplet/conformance-cli` | `0.2.x` | `0.3.0` |

These are minor releases because changing the event contract is breaking on 0.x. SDK, shim and NAP message APIs do not gain a legacy event mode. Conformance readers accept current events; older events need migration or older tooling.

## What changes

The kinds remain `5129` (snapshot), `15129` (root), and `35129` (named). This is a schema change within those kinds.

| Legacy event | Current event |
| --- | --- |
| `path /index.html <hash>` and aggregate `x` | One `x <artifact-sha256>` |
| `description` tag | Non-empty plain-text `content` |
| `requires <domain>` | Required `R <domain>` or optional `O <domain>` |
| `archetype <role> <convention>` | Independent `z <role>` and `i <intent> [parameter names…]` |

Never rename the aggregate hash to the artifact hash: they differ even for a single file. A new build hashes the final `index.html` bytes. Migration takes the artifact hash from the signed legacy `/index.html` path. Optional icon metadata is separate from artifact identity. Invalid or unavailable icons fall back to generic artwork rather than blocking the napplet.

Descriptions are literal text. Display them with text APIs rather than HTML or Markdown rendering. Required and optional domains advertise integrations; neither grants access. A shell evaluates the complete `R` set locally and checks its own policy, rather than treating relay filter matches as proof of compatibility.

## Deploy an existing project

Upgrade the Vite plugin and CLI. Supply a meaningful `description` option or HTML description meta for builds and `metadata.description` in `.napplet/config.yaml` for deployment overrides. The existing `requires` and `archetypes` config names remain valid authoring options; current output translates them to the new tags. `metadata.optional` and the plugin's `optional` option mark integrations that can be absent.

```sh
napplet deploy --dry-run --format current
napplet deploy --format current
```

Deploy always writes the current schema. Review the dry-run event content, tags and artifact hash before publishing.

CLI `0.7.0` through `0.14.x` also offered a temporary `--format legacy` writer for shells still expecting the old schema. CLI `0.15.0` removed it: it signed path tags and an aggregate `x` hash under the NIP-5D kinds, and current NIP-5D requires one `x` tag for a single self-contained `/index.html` with the description in `content`. `--format legacy` now fails with a pointer to single-file builds and `napplet migrate`. A shell that only reads the old schema needs updating; pinning an older CLI only keeps producing events that current readers reject.

## Prepare an event migration

Export the complete signed event JSON. The CLI verifies its signature and prepares an unsigned review file without fetching, executing, rewriting or uploading the artifact:

```sh
napplet migrate old-event.json --optional theme --output migration-preview.json
# Add --description "A meaningful description" when the old event lacks one.
```

The preview contains `sourceId`, `sourcePubkey`, `template` and review notes. Existing output files are never overwritten. `--optional` can only reclassify a domain already declared by the source; all other legacy requirements remain required. Unknown extension tags are retained. Invalid optional icons are removed with a note. Ambiguous identifiers, multiple artifact paths, invalid signatures and missing descriptions fail with an error.

The command does not sign or publish. Review the template, then use your event signing/publication tooling or the [migration web app](https://github.com/napplet/migrate). That app has its own documented spec revision; check its output against the live NIP before publishing. Signing with the original author preserves a replaceable event's address. A different signer creates a different address; snapshots always produce a new event ID. Keep the original signed event and deployment files for rollback.

## Compatibility beyond the CLI

- Shell ACL, consent and storage/config keys may incorporate identity hashes. The new artifact hash differs from the legacy aggregate even when artifact bytes are unchanged. Shell maintainers need an explicit verified data/grant migration policy; these packages do not silently transfer grants or saved data.
- Immutable legacy `nevent` pointers continue to reference legacy snapshots. Publish and share a new pointer. Named addresses can stay the same when the author and `d` identifier stay the same, but legacy readers may stop loading their newest event.
- Discovery code that filters `requires` or `archetype` needs `R`/`O` and `z`/`i`. During rollout, legacy catalog ingestion belongs in an explicit boundary; it must not silently treat the old aggregate as `x` artifact identity.
- The `.nip5a-manifest.json` filename and `nip5aManifest` helper remain compatibility names for local tooling. Current conformance checks derive identity from the event and downloaded artifact, not sidecar convenience fields.

NAP-INTENT now derives role and action from convention URIs, catalogs NIP-5D `z`/`i` advertisements, and exposes retained target delivery through `onDelivery`. NAP-SHELL readiness is optional and does not gate other domains. Follow the living NAP documents for those API contracts.

The CLI still applies its existing lowercase/hyphen naming policy when selecting deployment names. That is a tool limitation, not a NIP-5D restriction on `d` values; migration preserves identifiers exactly.
