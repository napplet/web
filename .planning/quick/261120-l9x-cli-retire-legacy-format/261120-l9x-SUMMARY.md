---
quick_id: 261120-l9x
status: complete
branch: fix/cli-retire-legacy-format
---

# CLI: retire `--format legacy` manifest output

The CLI's legacy serializer signed NIP-5A-style `path` tags, a 3-element aggregate `x` tag, a `description` tag and empty `content` under the NIP-5D kinds 5129/15129/35129. Current NIP-5D §Manifest (nostr-protocol/nips#2303, head f60550c3) requires exactly one `["x", "<sha256>"]` tag for the single `/index.html` artifact and a non-empty description in `content`, so every legacy event was non-conformant. Removed `src/manifest-legacy.ts` (and the public `computeAggregateHash` export), every `format === "legacy"` branch, `DeployManifestTemplate.aggregateHash`, and the interactive format prompt. `ManifestFormat` is now `"current"`; `selectManifestFormat(value)` is synchronous, accepts `--format current`, and rejects `--format legacy` with a pointer to single-file builds and `napplet migrate`. Validation runs before config loading and once for `deploy --all`. `napplet migrate` and legacy `.nip5a-manifest.json` sidecar input are unchanged. Format-agnostic legacy tests were converted to current; new tests cover the rejection paths. Docs, the migrate skill and a minor `@napplet/cli` changeset are included.

Verified: CLI `deno task check` and `deno task test:unit` (270 passed, 3 ignored); root `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, `pnpm check:jsr`, `pnpm test:skills-contracts` (11 pass), `pnpm test:agent-output` (14 pass) green; `deploy --format legacy --dry-run` smoke exits 1 with the new message. AI-slop 93/100, unchanged: only the three pre-existing root dependency advisories.

Known gaps: deploy and debug JSON reports keep `format: "current"` for script compatibility. HTML `<title>` is still emitted untrimmed on the current path (pre-existing behavior; the legacy path used to trim).
