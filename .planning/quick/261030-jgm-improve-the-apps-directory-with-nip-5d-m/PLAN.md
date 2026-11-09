---
status: complete
---

# Apps directory: manifest media, Zapstore fallback, applesauce discovery, infinite scroll

Quick task on `feat/astro-ecosystem-showcase` (PR #221). Planning, execution and verification run inline.

## Sources read

- NIP-5D at PR #2303 head `6e24617c`: `icon` is `["icon", <sha256>, <mime>]` with PNG/JPEG/WebP only; clients MUST fetch by hash from the manifest's `server` hints, verify SHA-256 and decoded format, and render verified bytes. `screenshot` and `preview` tags use NIP-92 `key value` fields with exactly one `x <sha256>`; malformed tags are ignored and never suppress discovery. Other tags: `z`, `i`, `R`, `O`, `t` is not listed, `title`, `source`, `source-commit`, `source-archive`, `a`/`A` lineage.
- Software Applications proposal (PR #1336 head `9d959cd9`, `82.md`): kind 32267 with `d`, `name`, `summary`, URL-valued `icon` and `image`, `t`, `url`, `repository`, `license`. It defines no link to napplet manifests.
- Live relay.napplet.soy: 135 manifests (47 with icons, 22 with screenshots in a superseded bare-hash shape, none in the current `x <sha>` form), and 80 kind 32267 listings by the same publishers carrying a non-standard `latest` tag that names the napplet address plus `name` and Blossom `image` URLs. relay.damus.io returns nothing for these kinds.
- applesauce 7: `applesauce-common/helpers` (`isValidNapplet`, `getNapplet*`, `normalizeBlossomServer`), `applesauce-core` `EventStore`, `applesauce-relay` `RelayPool` with per-relay `request()` completing at EOSE. Its napplet store example pages with `until` and verifies icons by hash before rendering.

## Decisions

1. Manifest media follows the current text: verified icon and verified screenshots are rendered from bytes, in the browser, after hash and format checks. Bare-hash screenshot tags are malformed under the current text and are ignored; this is reported to the user as an upstream publisher defect, not accommodated.
2. Zapstore fallback is a non-normative display heuristic: a kind 32267 by the same publisher whose `latest` or `a` tag names the napplet address, whose `d` extends the napplet identifier, or whose `name` equals the title. Its URL images are shown only when the manifest supplies no usable media, labelled as listing art.
3. Discovery uses applesauce: `RelayPool` per-relay requests, `EventStore` with signature verification, helpers for parsing. Visiting the page still contacts no relay; the first click is consent, after which infinite scroll pages older releases automatically.
4. Infinite scroll reveals the saved snapshot in pages of twelve, then pages relays with `until` once discovery is enabled. A visible "Load more" control covers keyboard users and browsers without IntersectionObserver.
5. `wss://relay.napplet.soy` stays first in `discovery.json`; the snapshot is refreshed and now also stores matching kind 32267 listings.

## Tasks

1. `catalog.ts`: parse icon, screenshots, preview, archetypes, topics, source; match listings. Unit tests for parsing and matching.
2. `media.ts`: verified Blossom fetch (sha256 via WebCrypto, magic bytes, decode), cached object URLs.
3. `store.ts` + `apps.astro` + `store.css`: card art, icon, paging, sentinel, applesauce discovery, status texts. Remove rotated monograms.
4. `refresh-showcase-apps.mjs`: page manifests, fetch listings for their authors, save both. Refresh the snapshot.
5. `check-app-store.mjs`: accept the listing request, assert fallback art and infinite scroll. README and discovery notes.
6. Gates: build, type-check, web units, app-store browser check, slop scan. Commit, push, update PR #221.
