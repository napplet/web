# @napplet/archetypes

[archetypes.napplet.run](https://archetypes.napplet.run): a searchable field guide to the archetypes (`z` tags) and intents (`i` tags) that napplet manifests advertise on public Nostr relays.

Archetypes and intents are ad hoc. NIP-5D lets every napplet name what it does and what it accepts, and there is no registry ([NAAT is deprecated](https://github.com/napplet/naps/blob/master/ARCHETYPES.md)). This site reports what people publish, where names converge, and where a human could help them converge. It is non-normative: the living [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) and [NAP-INTENT](https://github.com/napplet/naps) texts define the tags and dispatch.

## Pages

| Path | Content |
| --- | --- |
| `/` | Every archetype with status, intents and counts; search and status filters |
| `/archetypes/<slug>/` | Napplet × intent table with advertised parameter names, implementations, curator notes, nearby names |
| `/intents/`, `/intents/<archetype>/<verb>/` | Verbs across archetypes; per-intent parameter usage and adoption |
| `/clusters/`, `/clusters/<a~b>/` | Possible synonyms with evidence, a parameter alignment table and a draft curation entry |
| `/agents/` | Machine-readable surfaces and how the data is collected |

For agents: `/llms.txt`, `/llms-full.txt`, `/index.md`, `/archetypes/<slug>.md`, `/archetypes.json`, `/relays.json`, a sitemap, `robots.txt` that admits AI crawlers, JSON-LD on every page, and WebMCP tools (`search_archetypes`, `get_archetype`) in browsers that expose `navigator.modelContext`.

## Data flow

The daily build reads a snapshot of signed manifests. In production the [indexer](../archetypes-indexer) writes it and passes `ARCHETYPES_SNAPSHOT`. Without that variable, the build uses the checked-in seed `src/data/snapshot.json`, so development and CI need no network. `pnpm --filter @napplet/archetypes seed` regenerates the seed from the napplet.run app store's saved relay data.

In the browser, each page asks the relays the build ranked best for manifests newer than the build, verifies their signatures, and merges them in: a banner reports what changed, and new archetypes and napplets are marked until the next rebuild. Static content stays complete without JavaScript.

Napplets are counted once. Replaceable manifests keep their newest revision. Snapshots fold into the napplet their `a`/`A` lineage names, or else the same publisher's napplet with the same title.

## Synonyms and curation

Possible synonyms are suggested from:

- shared words in the names (`editor` inside `text-editor`)
- near spellings
- shared publishers, verbs and parameter names
- distinctive words the descriptions have in common

A napplet that advertises two names treats them as different facets, so such a pair is never suggested. Suggestions never merge anything.

Human decisions live in [`curation.yaml`](curation.yaml) and change by pull request:

```yaml
archetypes:
  game:
    status: diverse          # many shapes; does not need to coalesce
    note: Many different games share this name.
clusters:
  - members: [3d-model, cad-viewer]
    outcome: coalesce         # or distinct, or diverse
    preferred: 3d-model
    params:
      - same: [model, url]    # parameter names that mean the same thing
        note: cad-viewer names a model; 3d-model takes a blob url
    reviewed: 2026-11-25
```

`similarity` in the same file tunes the heuristics' weights and thresholds; defaults are listed in the file's comments. The build rejects unknown keys and malformed entries. Curation is site data: it never changes what a manifest means and is never published to relays.

## Develop

```bash
pnpm install
pnpm --filter @napplet/archetypes dev
pnpm --filter @napplet/archetypes test:unit
pnpm --filter @napplet/archetypes type-check
pnpm --filter @napplet/archetypes build && pnpm --filter @napplet/archetypes check:site
```

`check:site` checks every built page for a title, description, canonical URL, one `h1`, landmarks, labelled inputs, valid JSON-LD, working internal links, and Markdown twins.
