---
status: complete
---

# Preserve extension tags and validate defined manifest fields

The user wants CLI publishing to preserve additional Nostr event tags. Conformance should validate required fields and optional fields defined by the applicable specs, rather than impose a closed tag vocabulary. Read the current NIP-5D text at PR 2303 head 5560820fa4f37f45b8ab742a11aeb3001b17dc67 and NIP-01 before implementation. Living sources remain authoritative: https://github.com/nostr-protocol/nips/pull/2303 and https://github.com/nostr-protocol/nips/blob/master/01.md.

Evidence: the CLI's sidecar reader has a metadata allowlist and globally deduplicates tags. The current serializer strips legacy-named tags unconditionally. Conformance already permits unknown tags, but checks source cardinality without validating the current Source section's required shape and supported locations. The graph index has no matching tooling nodes, so source discovery uses text searches.

1. Add failing preservation tests spanning sidecar metadata, current/legacy publishing, snapshots, signing, and current-event migration. Include arbitrary names, repeated tags, extra elements, Unicode, and tags whose names resemble historical fields.
2. Separate description publishing hints from opaque event tags. Preserve extension payloads and multiplicity; retain explicit config precedence and computed publication fields. Convert historical fields only for legacy input. Keep public metadata helper compatibility.
3. Lock conformance openness with validator and runner tests. Check known required/optional fields according to current NIP-5D, including the Source section's exactly-two-element tag and HTTP/HTTPS/SSH/Git/SCP locations. Preserve the specified advisory/fallback handling for malformed icons. Do not invent requirements for unknown tags.
4. Update CLI/conformance docs and add package changesets. Run focused regressions, build, type checks, recursive unit tests, relevant contracts, native proof, and AI-slop. Commit, push, and open a PR.

No protocol surface is added. CLI-managed artifact hash, target identifier/lineage, publishing destinations, and publisher attribution retain their existing ownership. Original-checkout WIP and open PR 248 remain separate; use fix/preserve-event-tags from origin/main in an isolated worktree. The current Source clause also allows locations beyond the CLI's configured HTTP(S)-only source override; flag that compatibility limitation rather than silently treating it as protocol truth.
