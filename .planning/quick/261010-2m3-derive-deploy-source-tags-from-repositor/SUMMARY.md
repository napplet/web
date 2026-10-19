# Repository source metadata

The current NIP-5D manifest table permits zero or one source tag. Opened https://github.com/dskvr/nips/pull/10 against nip/5d to state that limit explicitly, define the existing HTTP(S) repository/archive URL directly, and remove the NIP-5A source-semantics reference. The CLI implements the existing schema and does not depend on that clarification merging.

Deploy previously preserved sidecar/HTML source tags but did not infer Git origin or accept a config source. Added metadata.source (HTTP(S) URL override, or false to suppress), with precedence config > sidecar > HTML > Git origin. Inference uses the selected artifact's repository, including nested builds and worktrees, without contacting remotes. Common clone URLs are normalized without credentials; missing Git/origin and unsupported local remotes are non-fatal. Current root, named and snapshot events keep one resolved tag; legacy does not gain automatic inference.

Verification: pnpm build, pnpm type-check, full pnpm -r test:unit, and targeted final CLI suite passed (182 CLI tests). Changed-code AI-slop gate: 100/100. Real dry runs using the GB Color build produced its GitHub source URL, replaced it with a config override, or omitted it with false. All retained the same artifact hash. Reports are in /tmp/napplet-source-proof; no events were published.

Prepared CLI 0.8.6 using changesets and synchronized the package and docs.
