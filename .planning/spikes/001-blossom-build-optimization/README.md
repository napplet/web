---
spike: 001
name: blossom-build-optimization
type: standard
validates: "Given a real 50 MiB Vite asset build, when the largest blobs are externalized and uploaded, then /index.html falls below 2 MiB and every canonical Blossom URL resolves through NAP-RESOURCE-equivalent bytesMany semantics"
verdict: VALIDATED
related: []
tags: [vite, blossom, nip-46, nap-resource, build]
---

# Spike 001: Blossom Build Optimization

> [!CAUTION]
> **Non-normative discovery erratum:** This spike's local kind-10063 discovery fixture incorrectly queried the user's read relays and excluded a write-only relay. That fixture result is not canonical protocol evidence and must not guide implementation. Phase 162 implementation and tests retrieve the signer's authored kind `10063` from verified write/unmarked kind-10002 relays, as directed by [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md). The measured Vite boundary, upload, descriptor/hash, and NAP-RESOURCE-equivalent byte-recovery results below remain valid.

## What This Validates

Given a real Vite build containing 50 MiB of imported game-like assets, when a close-bundle optimizer measures the would-be single-file HTML, orders emitted assets largest-first, replaces enough references with `blossom:sha256:<hex>`, uploads those exact bytes, and embeds a tool-owned resource manifest, then the generated `/index.html` is below 2 MiB and every externalized resource can be recovered through NAP-RESOURCE `bytesMany` semantics with a matching SHA-256.

## Research

| Approach | Source | Pros | Cons | Status |
|----------|--------|------|------|--------|
| Canonical Blossom URI plus NAP-RESOURCE `bytes`/`bytesMany` | [NAP-RESOURCE proposal](https://github.com/napplet/naps/pull/80) | Exact `blossom:sha256:<hex>` form and runtime hash verification are defined | Proposal is still open/draft; no embedded build-manifest shape is defined | Chosen for runtime transport |
| Kind `10002` then kind `10063` discovery | [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md), [NIP-B7](https://github.com/nostr-protocol/nips/blob/master/B7.md) | Separates relay discovery from Blossom server preferences and lets the newest replaceable event win | The local fixture used the wrong relay direction; Phase 162 uses verified write/unmarked relays | Discovery direction invalid in this spike; corrected in Phase 162 |
| NIP-46 terminal session persisted as `nbunksec` | [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md) plus existing `@napplet/cli` implementation | Existing QR, pasted `bunker://`, ephemeral client key, keychain storage, and reconnect tests already exist | Current implementation is Deno-oriented and cannot be imported directly into the Node Vite plugin without a shared extraction | Chosen; shared tooling is required |
| Browser-native `blossom:` navigation | Browser URL handling | No injected loader | Browsers do not fetch the proposed custom scheme and the NIP-5D sandbox has no raw network access | Rejected |

The canonical documents do not define a resource manifest inside `/index.html`. The prototype therefore treats its embedded JSON as non-normative plugin metadata consumed only by injected napplet-side tooling; shells remain constrained solely by the proposed NAP-RESOURCE operations.

## How to Run

```bash
node .planning/spikes/001-blossom-build-optimization/prototype.mjs
deno test --allow-read --allow-write --allow-run --allow-env packages/cli/tests/nostr_connect_test.ts packages/cli/tests/deploy_signer_test.ts packages/cli/tests/deploy_network_test.ts
```

Open [report.html](./report.html) in a browser to inspect the before/after artifact sizes and per-asset result.

## What to Expect

- The synthetic Vite build contains exactly 50 MiB across five imported assets.
- The would-be all-inline HTML exceeds 2 MiB.
- Assets are externalized in descending byte order until the HTML is below 2 MiB.
- Every externalized reference is `blossom:sha256:<64 lowercase hex characters>` and is present in the embedded tool-owned manifest.
- A local Blossom server accepts BUD upload authorization signed as kind `24242`, verifies the uploaded hashes, and stores the exact bytes.
- A fake NAP-RESOURCE runtime receives the manifest URLs through one ordered `bytesMany` call and returns verified Blobs.
- The historical newest-event fixture keeps the newest kind `10002` and kind `10063`, but its read-relay query direction is invalid evidence; Phase 162 tests the corrected write/unmarked path.
- Existing CLI tests prove QR NIP-46 connection, `nbunksec` creation/persistence, remote signing, and Blossom upload behavior.

## Investigation Trail

1. The current single-file plugin forces Vite to inline every asset, which destroys the file boundaries needed for largest-first selection. The production design must retain emitted asset boundaries until close-bundle processing, construct the would-be all-inline representation for threshold measurement, and only then choose inline versus Blossom per asset.
2. Kind `10002` is not a Blossom server list. It supplies user relay preferences; the Blossom preference event is replaceable kind `10063` per NIP-B7/BUD-03.
3. Replacing URLs with `blossom:` strings is insufficient on its own because browsers do not resolve that scheme. The built napplet needs injected, napplet-side loading logic that calls the already implemented `window.napplet.resource.bytes` or `bytesMany` surface. This is implementation plumbing over the proposed NAP, not a new wire message.
4. The repo already contains tested NIP-46 QR/paste connection, `nbunksec` encoding, OS credential storage, reconnect, and Blossom upload code in `@napplet/cli`. The real implementation should extract Node-compatible shared build tooling rather than fork the protocol logic in the Vite plugin.

## Results

VALIDATED.

- The real Vite build's would-be all-inline artifact measured `70,256,062` bytes.
- Largest-first selection externalized `33,554,432`, `12,582,912`, and `5,505,024` byte assets, in that order.
- The resulting `/index.html` measured `1,400,366` bytes, below the `2,097,152` byte threshold, while the `524,288` and `262,144` byte assets remained inline.
- All three offloaded blobs were accepted by a local Blossom server only after it verified a real signed kind `24242` upload authorization; each stored SHA-256 matched its canonical URI.
- One ordered NAP-RESOURCE-equivalent `bytesMany` call returned all three exact Blobs, and every returned hash matched the `blossom:sha256:<hex>` request URL.
- The discovery fixture selected kind `10002` at `created_at: 20` and kind `10063` at `created_at: 40`, but it incorrectly excluded the write-only relay and queried advertised read relays; this measured fixture outcome is retained only as invalid historical evidence and is superseded by the Phase 162 write/unmarked-relay tests.
- The existing CLI integration suite passed `28/28` tests covering QR and pasted-bunker NIP-46 connection, ephemeral client-key `nbunksec` encoding, credential-store persistence/reconnect behavior, BUD upload authorization compatibility, hash mismatch rejection, mirror behavior, and manifest publication gating.

The proof also falsified two naive approaches: file-path matching cannot assume Vite's emitted URL contains `assets/` because chunk-relative `new URL("hashed.bin", import.meta.url)` is common, and replacing references alone cannot load custom-scheme resources without napplet-side NAP-RESOURCE plumbing.
