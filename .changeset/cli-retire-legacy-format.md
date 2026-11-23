---
"@napplet/cli": minor
---

Retire the temporary `--format legacy` deploy output. It signed NIP-5A-style `path` tags, a 3-element aggregate `x` tag, a `description` tag and empty `content` under the NIP-5D kinds 5129/15129/35129, which current NIP-5D §Manifest rejects (one 2-element `x` tag for the single `/index.html` artifact, description in `content`). `napplet deploy` and `napplet debug` still accept `--format current`; `--format legacy` now fails with a pointer to single-file builds and `napplet migrate`, and the interactive format prompt is gone. Breaking library changes: the `computeAggregateHash` export is removed, `ManifestFormat` is now only `"current"`, `selectManifestFormat(value)` is synchronous and drops its `interactive`/`ask` parameters, and `DeployManifestTemplate.aggregateHash` is removed. `napplet migrate` and legacy `.nip5a-manifest.json` sidecar input are unchanged.

Migration: build a single-file `/index.html` and deploy with the default (or `--format current`); convert old signed legacy events with `napplet migrate <event.json>`.
