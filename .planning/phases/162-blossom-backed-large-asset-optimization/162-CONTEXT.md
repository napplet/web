# Phase 162: Blossom-backed large-asset optimization - Context

**Gathered:** 2026-08-21
**Status:** Ready for planning
**Source:** PRD Express Path (`.planning/spikes/MANIFEST.md` plus Spike 001 evidence)

<domain>
## Phase Boundary

Add an automatic optimization mode to `@napplet/vite-plugin` for large single-file napplet builds. A would-be single-file artifact over 2 MiB enters optimization, discovers a NIP-46 signer and the user's current Blossom servers, moves the largest build blobs to Blossom until the HTML is below the target when possible, embeds tool-owned resource metadata, replaces build references with canonical Blossom URLs, and makes those resources consumable through the proposed NAP-RESOURCE API. The motivating workload is a game with 50 MiB or more of assets.

</domain>

<decisions>
## Implementation Decisions

### Optimization trigger and ordering

- Measure the would-be single-file `/index.html`; optimization activates only when that representation exceeds exactly `2 * 1024 * 1024` bytes.
- Preserve Vite asset boundaries through selection, order candidate blobs by byte size descending with a deterministic tie-breaker, and externalize candidates in that order.
- Stop selecting once the fully rendered HTML including the embedded resource metadata is below 2 MiB.
- If every eligible blob is externalized and the HTML remains above 2 MiB, finish successfully with a visible report; the threshold is an optimization target, not a conformance or build-failure rule.

### Signer session and secret storage

- Optimization obtains a session signer through NIP-46 in the terminal, showing a `nostrconnect://` QR flow and accepting the existing pasted `bunker://` fallback.
- Persist the resulting `nbunksec` through a secret-store abstraction and reuse it on later builds when reconnect succeeds.
- Never put `nbunksec`, the ephemeral client private key, or any signer secret into `/index.html`, the resource manifest, build logs, Vite cache, or committed project configuration.
- Reuse or extract the repo's tested NIP-46/key-store implementation instead of independently reimplementing the NIP-46 wire protocol inside the Vite plugin.

### Relay and Blossom discovery

- Query a bounded default set of directory/index relays including `wss://purplepag.es` plus other established public relays for the signer's replaceable kind `10002` event.
- Verify candidate Nostr events and keep the newest valid replaceable kind `10002` by `created_at` with a deterministic tie-breaker.
- Query the user's advertised write/unmarked relays for kind `10063`, the NIP-B7/BUD-03 Blossom server-list event; NIP-65 identifies these as the relays from which a user's authored events should be retrieved. Keep the newest valid event found and preserve its valid `server` tag order after URL normalization/deduplication.
- Kind `10002` is relay discovery only. Do not treat its `r` tags as Blossom servers.
- Provide a deliberate fallback/error path when no valid user Blossom server list is available; do not silently upload to an unrelated server as if it were the user's preference.

### Blob upload and metadata

- Hash the exact emitted blob bytes with lowercase SHA-256 and upload those same bytes to the selected Blossom servers using the existing tested BUD authorization/upload compatibility behavior.
- A selected resource reference is exactly `blossom:sha256:<64 lowercase hex characters>` as defined by the published NAP-RESOURCE proposal.
- Embed a deterministic, tool-owned JSON mapping of original emitted asset identity to canonical URI, SHA-256, byte length, and MIME classification in `/index.html`.
- The embedded mapping is explicitly non-normative implementation metadata. It must not be presented as a NIP-5A tag, NIP-5D requirement, NAP wire message, shell handshake, or condition of general napplet conformance.
- Only remove emitted asset files after every required upload succeeds on at least one selected server and the final HTML references and hashes have been verified.

### NAP-RESOURCE runtime path

- Browser-native loading of `blossom:` is not assumed. Generated napplet-side loading code must call the existing `window.napplet.resource.bytes`/`bytesMany` contract and must not grant raw fetch/socket access.
- The build must arrange for each automatically replaced resource path to be resolved through NAP-RESOURCE without adding a new protocol message. The exact internal loader/module design is the agent's discretion, but it must cover the game-oriented browser consumers proven by tests and document unsupported URL-consumer shapes honestly.
- Runtime hash verification remains mandatory at the NAP-RESOURCE boundary; build-time upload success is not a substitute.

### Demonstration and release

- Keep a deterministic integration fixture at least 50 MiB before optimization without committing large binary blobs; generate them during the test.
- The demonstration must prove the measured pre-optimization size, descending selection order, final artifact size, embedded mapping, authenticated uploads, reference replacement, and NAP-RESOURCE recovery of byte-identical blobs.
- Update package docs and add a changeset for every package whose shipped output changes.
- Completion requires full repository gates, atomic commits, a pushed branch, and an open PR.

### the agent's Discretion

- Public option naming and detailed TypeScript types, provided the default/automatic trigger remains clear and testable.
- Whether shared Node-compatible signer/discovery/upload code lives in a new internal package or an existing package export, provided no package cycle or Deno-only import leaks into the Vite plugin.
- Exact deterministic JSON element/constant shape and loader bootstrap arrangement, provided they remain private tooling metadata and do not impersonate protocol surface.
- Concurrency, retry, timeout, and mirror strategy within the existing BUD compatibility behavior, provided failures are fail-closed before asset deletion.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.** Protocol requirements come from the living external sources; the repo paths below are implementation evidence and reusable patterns only.

### Living protocol sources

- <https://github.com/nostr-protocol/nips/pull/2303> — NIP-5D web sandbox/loading and envelope boundary.
- <https://github.com/napplet/naps/pull/80> — published NAP-RESOURCE proposal, including `blossom:sha256:<hex>` and `resource.bytes`/`bytesMany`.
- <https://github.com/nostr-protocol/nips/blob/master/46.md> — NIP-46 remote signer session semantics.
- <https://github.com/nostr-protocol/nips/blob/master/65.md> — kind `10002` relay list semantics.
- <https://github.com/nostr-protocol/nips/blob/master/B7.md> — kind `10063` Blossom server list discovery and content-hash verification.
- <https://github.com/nostr-protocol/nips/blob/master/5A.md> — NIP-5A manifest/path/aggregate-hash substrate adopted by NIP-5D.

### Verified feasibility evidence

- `.planning/spikes/001-blossom-build-optimization/README.md` — measured 50 MiB Vite proof, constraints, and validated results.
- `.planning/spikes/001-blossom-build-optimization/prototype.mjs` — runnable build, selection, upload, discovery, and NAP-RESOURCE-equivalent resolution experiment.

### Existing implementation patterns

- `packages/vite-plugin/src/index.ts` — plugin lifecycle and close-bundle entry point.
- `packages/vite-plugin/src/html.ts` — current single-file config/inlining and artifact assertions.
- `packages/vite-plugin/src/manifest.ts` — output preparation and NIP-5A manifest generation ordering.
- `packages/vite-plugin/src/types.ts` — public plugin options and plugin state.
- `packages/cli/src/nostr-connect.ts` — tested terminal QR/paste NIP-46 connection and `nbunksec` creation.
- `packages/cli/src/deploy-signer.ts` — tested stored signer reuse, reconnect, and secret-store integration.
- `packages/cli/src/key-store.ts` — OS credential store providers.
- `packages/cli/src/blossom-upload.ts` — BUD upload authorization, compatibility retries, hash verification, and mirror results.
- `packages/cli/src/suggestions.ts` — current relay/Blossom discovery utilities; useful code but not authoritative over kind `10002` then `10063` requirements above.
- `packages/nap/src/resource/types.ts` — current NAP-RESOURCE message/types implementation.
- `packages/nap/src/resource/shim.ts` — `bytes`, `bytesMany`, cancellation, and Blob result handling.
- `packages/nap/src/resource/sdk.ts` — public resource helper patterns.

</canonical_refs>

<specifics>
## Specific Ideas

- Spike 001 reduced a real Vite fixture from `70,256,062` would-be-inline bytes to a `1,400,366` byte `/index.html` by externalizing `33,554,432`, `12,582,912`, and `5,505,024` byte blobs, while leaving `524,288` and `262,144` byte assets inline.
- Vite emitted both chunk-relative `new URL("hashed.bin", import.meta.url)` references and CSS `url(./hashed.bin)` references. Production matching cannot assume an `assets/` prefix survives in the reference string.
- The existing targeted integration suite passed 28/28 tests for QR/paste NIP-46, `nbunksec` storage/reconnect, and Blossom authorization/upload/mirror behavior.

</specifics>

<deferred>
## Deferred Ideas

None — the phase covers the complete requested optimization path. Unsupported browser URL-consumer shapes must be documented as limitations rather than silently deferred.

</deferred>

---

*Phase: 162-blossom-backed-large-asset-optimization*
*Context gathered: 2026-08-21 via PRD Express Path*
