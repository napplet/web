---
status: complete
---
# Expand the app store discovery relay pool

Branch: `feat/store-discovery-relays`, cut from `origin/main` after #295. The relay list is site configuration, not protocol surface: NIP-5D defines the manifest kinds the site asks for, not where a site looks for them. No changeset, because `@napplet/web` is private.

## Changes

- `7083813f`: `apps/web/src/data/discovery.json` adds `wss://relay.ditto.pub`, `wss://relay.primal.net` and `wss://relay.nostr.com` after `wss://relay.napplet.soy` (kept first: the store check treats the first configured relay as the NIP-77 one) and `wss://relay.damus.io`. Probing the five relays directly showed the refresh was the real cause of missing napplets, not only the pool: it stopped paging a relay as soon as a page came back shorter than `limit`, but its `request` drops frames over 100 kB, so one oversized manifest on a page ended that relay's history early (damus returned 79 of 261 events, ditto 159 of 560), and the 600-event cap truncated relay.napplet.soy itself at 640 of 653. The manifest pager now lives in `scripts/lib/manifest-pager.mjs`: inclusive `until`, de-duplication by id, one second stepped past a boundary that adds nothing, stop only on an empty page, a failed request or the cap (default 2000). Three unit tests cover the short-page continuation, the shared-second boundary and the cap/failure reporting. README paging sentence updated.
- `fd8ad95a`: the production store check derived its expected "Checked N/N" status and its two-relay wording from `config.relays`.

## Snapshot

Refreshed from the five relays, all of which reached EOSE: 649 → 668 signed manifests, 501 → 516 releases (15129/35129 addresses), 306 → 308 publishers, 117 → 130 listings, 17 → 34 profiles, 201 → 284 Napshot labels. Nothing previously saved was dropped. The new publishers are Relay Ping & Health Radar (ditto only) and `napplet-test-limited`; the rest are older releases from relay.napplet.soy that the cap had cut. Three StarBright manifests seen on primal, damus and ditto are still excluded: each carries ~140 kB of content and no `x` tag, so the catalog would reject them anyway.

## Verification

- `pnpm build`, `pnpm type-check`, `pnpm -r test:unit` all green (web 57/57).
- `node --test scripts/refresh-showcase-apps.test.mjs`: 11/11 including the three new pager cases.
- `node scripts/check-app-store.mjs http://127.0.0.1:8123` against the assembled site passes with five relays; `node scripts/check-app-store-napshot.mjs` passes unchanged.
- aislop 0.12.0: 98/100, only the baseline `deepmerge` advisory.
