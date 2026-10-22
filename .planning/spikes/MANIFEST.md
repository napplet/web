# Spike Manifest

## Idea

Prove that `@napplet/vite-plugin` can keep a napplet's `/index.html` near a 2 MiB target by moving the largest build assets to Blossom, replacing their build references with canonical `blossom:sha256:<hex>` URLs, and resolving those URLs through the proposed NAP-RESOURCE boundary at runtime.

## Requirements

- The optimization threshold is 2 MiB and is evaluated against the would-be single-file artifact.
- Assets are considered from largest to smallest until the rendered HTML falls below the threshold; failing to reach the threshold is a non-fatal optimization result.
- Blossom URLs use the proposed NAP-RESOURCE canonical form `blossom:sha256:<hex>`.
- Kind `10002` is used to discover the user's relay list; the newest kind `10063` event found through those relays supplies the user's Blossom servers.
- Remote signing uses NIP-46 and persists the resulting `nbunksec` through a secret-store abstraction, never in the generated napplet artifact.
- Any embedded resource manifest is explicitly tool-owned, non-normative metadata and does not add a shell requirement or a new NIP-5D/NAP wire message.

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | blossom-build-optimization | standard | Given a real 50 MiB Vite asset build, when the largest blobs are externalized and uploaded, then `/index.html` falls below 2 MiB and every canonical Blossom URL resolves through NAP-RESOURCE-equivalent `bytesMany` semantics | VALIDATED | vite, blossom, nip-46, nap-resource, build |
