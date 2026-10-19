---
name: napplet-migrate
description: Migrate legacy NIP-5D manifest events or deployment projects to the current artifact-hash schema, review CLI format choices, and explain event-pointer and shell identity compatibility.
---

# Migrate napplet events

Read the living [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) Manifest and Identity sections before changing events. This skill is non-normative workflow guidance. Domain operations remain defined by the [NAP track](https://github.com/napplet/naps); do not infer new operations from manifest metadata.

Identify whether the user wants a project rebuild, an event conversion preview, or publication. Preserve the signed source and existing deployment files. CLI 0.7.0, vite-plugin 0.15.0 and conformance 0.18.0 introduce current defaults; package versions are independent.

For a project, upgrade the writer and provide a meaningful description in the plugin or ordinary HTML description metadata. CLI-owned deployment metadata can override it. Preview with `napplet deploy --dry-run --format current`. Inspect the final artifact hash, plain-text content, required/optional domains and intent advertisements.

For a signed event file, run `napplet migrate source.json --output preview.json`, optionally adding `--description` and repeated `--optional <domain>` choices. The command verifies the signature and writes an unsigned preview; it neither signs nor publishes. Multi-file manifests need rebundling before this conversion. Review source author, target kind/d identifier, description and required/optional classification before any separately authorized publication.

Never reuse a legacy aggregate as the artifact hash. Current x comes from the final artifact bytes; legacy conversion extracts the signed /index.html path hash. Keep intent identities queryless and put advertised parameter names in separate i-tag elements. Treat descriptions as text. Unknown extensions need their own specification; do not fabricate mappings for ambiguous tags.

Legacy-only shells can temporarily use `napplet deploy --format legacy`. The CLI isolates this serializer for removal. Legacy output loses optional-domain distinctions and intent parameter advertisements. Do not silently choose legacy to make a current conformance check pass.

Flag downstream work: artifact identity changes can affect shell ACL/storage keys; snapshots need new event pointers; publishing under another author changes addresses; catalog filters must follow the current tags. Do not silently transfer permissions or saved data. See the [migration guide](https://napplet.run/docs/guide/event-migration) for the package workflow and limitations.
