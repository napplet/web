# Research (non-normative)

Live NIP-5D Manifest/Identity sections: https://github.com/dskvr/nips/blob/nip/5d/5D.md#manifest and #identity. Browser cached raw text was stale; GitHub API head is b9d1ab17eb695fca90d800b7b0f93ca0f6578874. Do not vendor this text as a local spec.

Writers: CLI manifest.ts, manifest-metadata.ts; Vite plugin manifest.ts. Readers: conformance validators/manifest.ts; apps/conformance target.ts. CLI upload payloads follow manifest.files. Public config can keep requires/archetypes ergonomics while emitting R and z/i. Add optional capability and intent parameter configuration.

Reference migration app: https://github.com/napplet/migrate/blob/main/docs/migration.md. It targets an older pinned proposal, so only UX/input ideas apply: signed source, editable description, explicit required/optional classification, preview, reject ambiguous multi-file input, preserve originals. Do not copy its source URL extensions as protocol rules.

Spec drift flagged: NAP ARCHETYPES.md still advertises archetype tags and shell.supports, unlike current NIP-5D. Preserve NAP-INTENT runtime API; current manifest serialization follows NIP-5D. Existing conformance unknown-domain hard rejection incorrectly equates package registry with all possible NAPs; replace with syntax validation and advisory for unrecognized domains.

Compatibility: legacy CLI writer and legacy migration input only. Shell ACL/storage identities change from aggregate to artifact hash; no automatic data migration is safe in this SDK. Immutable legacy snapshots and legacy-only shells require operator rollout coordination. Local .nip5a-manifest.json name stays for build/deploy discovery compatibility.

Release baseline: CLI 0.6.0, vite-plugin 0.14.1, conformance 0.17.0; final minor versions derive from affected shipped outputs using changesets.
