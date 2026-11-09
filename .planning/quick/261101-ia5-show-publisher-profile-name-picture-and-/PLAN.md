# Show publisher profile name, picture and nostr.at link on app store cards

Discovered release cards show the publisher only as a truncated hex key. The signing key still identifies the publisher (NIP-5D), but a kind 0 profile (NIP-01) from the same relays can name it and put a face on it, and the key should link somewhere useful. This is display convenience, not protocol surface.

1. `apps/web/src/lib/catalog.ts`: `authorProfile` reads a signed kind 0 event (display name or name, HTTPS picture only, bounded lengths); `withProfiles` attaches the newest profile per publisher. `apps/web/src/lib/card.ts`: the publisher line links to `https://nostr.at/<npub>` and shows the picture and name when available, falling back to the short key; the name joins the search text. Styles in `store.css`.
2. `scripts/refresh-showcase-apps.mjs`: request kind 0 with the kind 32267 listings for the same publishers and save them under `profiles`; refresh the snapshot. `apps/web/src/lib/store.ts`: seed the store with saved profiles, request kind 0 with listings for newly discovered publishers, and render profiles from the store.
3. Tests: `catalog.test.ts` covers profile parsing, newest-wins, card rendering, escaping and the fallback; `check-app-store.mjs` serves a profile for the injected publisher and asserts the link, name and picture after discovery, and that saved cards link to nostr.at.
4. `apps.astro` details copy and `apps/web/README.md` describe the profile line and that the key, not the name, identifies the publisher.
5. Verify with `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, both browser checks and the slop gate; commit atomically on `feat/store-author-profiles`, push, open the PR.

No changeset: `@napplet/web` is private.
