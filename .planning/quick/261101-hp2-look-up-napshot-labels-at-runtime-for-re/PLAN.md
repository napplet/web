# Look up Napshot labels at runtime for releases without publisher artwork

The app store aggregates trusted Napshot NIP-32 labels into the snapshot at build time and re-requests them only after the visitor opts into relay discovery. A saved release that ships without a manifest screenshot, listing art or a saved preview keeps its monogram until someone presses "Check for new apps", so captures published after the snapshot never reach most visitors. Napshot's own label profile (kind 1985, `#screenshot`) is display-only and not NIP-5D or NAP surface; nothing here changes protocol behaviour.

1. `apps/web/src/lib/card.ts` and `apps/web/src/lib/store.ts`: carry the eligible release id in the card's media data; when a hydrated card ends up with no verified screenshot, no listing art and no saved preview, queue its id, flush the queue as one batched label request per relay (trusted signers only, exact `#e` targets, the existing `fetchLabels` paging) through a lazily opened pool, and apply any verified preview to the waiting card. Opening the pool for a label lookup must not count as a discovery pass for paging.
2. `apps/web/src/lib/store.test.ts`: cover targeted label fetching and preview resolution from the store.
3. `scripts/check-app-store.mjs` and `scripts/check-app-store-napshot.mjs`: the "visiting contacts no relay" assertions become "visiting only requests trusted labels for releases without artwork"; the fixture check proves the late label appears on visit without a discovery pass and that listing art, verified screenshots and snapshots never ask.
4. `apps/web/src/pages/apps.astro` and `apps/web/README.md`: describe the on-view lookup honestly next to the existing relay-contact copy.
5. Verify with `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, both browser checks and the pinned slop gate; commit atomically on `feat/runtime-napshot-labels`, push, open the PR.

No changeset: `@napplet/web` is private.
