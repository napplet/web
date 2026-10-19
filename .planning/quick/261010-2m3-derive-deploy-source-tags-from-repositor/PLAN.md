# Repository-derived deployment source

Canonical NIP-5D at dskvr/nips nip/5d (020cb8b) defines source cardinality 0-1 and delegates URL semantics to NIP-5A. Open a documentation PR against nip/5d defining the existing single HTTP(S) source-repository/archive tag directly and explicitly prohibiting multiple source tags. Do not change cardinality or add protocol surface.

Implement missing CLI metadata.source override and Git origin fallback from each selected artifact's repository. Preserve explicit sidecar/HTML source metadata ahead of inference, permit false to suppress source publication, normalize common clone URLs without credentials, and omit inference when Git/origin is unavailable. Apply automatic inference to current events; preserve legacy defaults. Verify real Git repositories, config precedence, signed root/named/snapshot events, non-repository fallback and overrides, plus full repository gates. Update docs and release metadata and open the CLI PR.
