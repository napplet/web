---
status: in-progress
---

# Embed publishing metadata and recover standalone HTML deployments

Canonical authority: living [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303), especially HTML Metadata for Publishing, Manifest, Icon, and Required and Optional Capabilities. Reviewed proposal head `020cb8b33a9e4c6b8ca4b2f9d0ed0a67843b68f7`. This plan describes implementation choices, not protocol requirements.

1. Resolve plugin options over existing head declarations, add explicitly enabled inference, let optional declarations win overlapping requirements, and render the resolved manifest metadata before hashing. Parse HTML structurally; preserve unrelated bytes. Add icon byte input while retaining hash-only callers with an explicit recovery limitation. Embed only supported data-URL icons whose bytes match the manifest hash. Named builds omit snapshot lineage.
2. Recover current-format metadata from standalone HTML in CLI deploys. Keep explicit deploy selection/config and sidecars authoritative over head fallbacks. Carry decoded icon bytes to the Blossom upload path without writing files or mutating the artifact. Keep root/named/snapshot tag restrictions and existing snapshot provenance behavior.
3. Add regression tests for mappings, escaping, duplicates, precedence, kind restrictions, final-byte hashes, standalone recovery and identical icon upload bytes. Update plugin/CLI docs and changesets. Run build, type checks, workspace unit tests, relevant contract tests, and the repository AI-slop gate; commit, push, and open a PR.

The attachment is truncated after “Ensure napplet deploy can recover specified metadata from”; interpreted as standalone built index.html without the sidecar. Work is isolated in `feat/html-publishing-metadata`; unrelated original-worktree changes remain untouched. GSD quick executes inline.
