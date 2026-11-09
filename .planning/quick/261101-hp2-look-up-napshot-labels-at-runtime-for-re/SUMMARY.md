---
status: complete
---
# On-visit Napshot label lookups

Branch: `feat/runtime-napshot-labels`, cut from `origin/main` after #289. No protocol surface changes: Napshot's kind 1985 `#screenshot` label profile stays display-only, and nothing a shell or napplet must do changed. No changeset, because `@napplet/web` is private.

## Changes

- `12f5b81b`: a saved release card that ends up with no verified screenshot, no listing art and no saved preview queues its manifest id while hydrating; the queue flushes after 100 ms as one batched label round through the existing `fetchLabels` pager (now accepting an explicit target list) over a lazily opened pool, accepts labels only from the configured signers, and applies a verified preview to the waiting card. Opening the pool for a lookup no longer counts as a discovery pass for paging (`synced` flag). `previewsFor` resolves previews from the store for a set of ids. `card.ts` carries the eligible release id in the media data.
- `fa702345`: listing art excludes the lookup, matching the saved-preview rule. `check-app-store.mjs` asserts that visiting or paging the saved collection sends relays only kind 1985 requests with no NIP-77 negotiation; `check-app-store-napshot.mjs` adds the on-visit scenario (the late label renders before any discovery pass; listing art, a verified screenshot, a saved preview and a snapshot never ask; a stale-revision release asks again). The store page's relay-contact copy and the README describe the lookup.

## Verification

- `apps/web` unit tests: 54/54, including the new targeted-fetch and preview-resolution case (snapshots and unknown ids are never targets; the verified label resolves with signer, mode and label id).
- `node scripts/check-app-store-napshot.mjs` passes with the on-visit scenario. The first run caught the listing-art card asking; the card-side exclusion fixed it.
- `node scripts/check-app-store.mjs` passes against the assembled site (served on 127.0.0.1:8123; a stray local process holds 8099).
- `pnpm build`, `pnpm type-check` and `pnpm -r test:unit` pass. aislop 0.12.0 reports only the baseline `deepmerge` advisory.

## Notes

The page now opens the relay pool on visit whenever a card without publisher artwork is on screen, so the applesauce chunk loads for most visitors instead of only after opting in; the page copy says so. A card that gets no answer keeps its monogram; incomplete batches stay retryable on the next discovery pass.
