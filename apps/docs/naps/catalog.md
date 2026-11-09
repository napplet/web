# CATALOG — runtime napplet discovery

This is non-normative guidance for the shipped packages. The living [NAP-CATALOG draft](https://github.com/napplet/naps/pull/95) defines the contract; [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) defines web injection and verified manifests.

## Read a snapshot

```ts
import { catalog } from '@napplet/sdk/catalog';

if (window.napplet?.catalog) {
  try {
    const snapshot = await catalog.get();
    for (const napplet of snapshot.napplets) {
      const label = document.createElement('span');
      label.textContent = napplet.title ?? napplet.description;
      document.body.append(label);
    }
  } catch (error) {
    // Keep the rest of the app usable when discovery fails.
    console.error('Catalog unavailable', error);
  }
}
```

The SDK root also exports `catalog` and `catalogGet`. The catalog subpath exports `get` as an alias. `@napplet/nap/catalog/sdk` provides `catalogGet` and `get`; `@napplet/nap/catalog/types` provides the snapshot and envelope types. No helper installs the runtime namespace.

`get()` returns a point-in-time `CatalogSnapshot` with `napplets` and `handlers`. An empty catalog is a successful result. Calls reject on runtime errors or request timeout. The domain works independently of `shell` readiness and of whether `intent` is exposed.

Entries describe available napplets, including those with no archetype or running instance. Each carries an opaque `id`, verified manifest `identity`, plain-text `description`, required and optional domain lists, and advertised archetypes with convention identities and parameter names. `title` is optional. Identity covers named, root, and snapshot manifests; only named identities carry `dTag`. Parameter names describe advertisements, not payload types or validation rules.

## Preserve selectors

`handlers` reports the current implicit target for each returned archetype, using an entry's exact `id` or `null`. This says nothing about focus, visibility, or running instances. When the runtime also supports intent dispatch, preserve the returned selector unchanged as an explicit `handler` after user authorization. Never derive it from `dTag`, substitute another target after a selection fails, or treat discovery as permission to launch. Snapshots do not pin later resolution to the same artifact version.

Catalog discovery does not install, launch, focus, invoke, or change handler preferences. The runtime can filter entries under caller policy. Render all display metadata as text, such as with `textContent`; do not insert it as HTML.

## Runtime and build integration

Runtimes can select `catalog` in the `@napplet/shim/prelude` allowlist. The installed `window.napplet.catalog.get()` sends `catalog.get` with a correlation `id`; the matching `catalog.get.result` carries a snapshot or an error. Host code owns verified manifests, policy, and resolver state.

Declare `optional: ['catalog']` in the Vite manifest plugin when discovery is an enhancement. Use `requires: ['catalog']` when it is essential. Requirement inference recognizes catalog subpath imports and direct `window.napplet.catalog` access. Neither declaration grants access or implies an `intent` requirement.
