---
status: complete
---

# Apps directory: manifest media, Zapstore fallback, applesauce discovery, infinite scroll

Commit `9ac7d606` (plus a follow-up for icon artwork) on `feat/astro-ecosystem-showcase`, PR #221.

## What changed

- **Manifest media per the living NIP-5D text** (PR #2303 head `6e24617c`). `catalog.ts` parses `icon` (`sha256`, MIME) and `screenshot`/`preview` tags (NIP-92 `key value` fields with exactly one `x <sha256>`) with the `applesauce-common` helpers; `media.ts` fetches blobs by hash from the manifest's `server` hints, verifies SHA-256 with WebCrypto, checks the declared format against the bytes, decodes, and renders an object URL. Absent or failing media falls back to generic artwork. A verified icon also stands in for the artwork when no screenshot or listing art exists.
- **Software Applications fallback** (PR #1336, `82.md`). When a manifest has no usable media, a kind 32267 listing from the same publisher that names the release (`latest`/`a` address, identifier prefix, or identical name) supplies URL-based listing art and icon, labelled "Listing art". The proposal defines no link between the two kinds; the pairing is documented as this site's display heuristic and never touches release identity. Markdown content of listings is not rendered.
- **NIP-77 via applesauce (review follow-up).** Scrolling past the saved collection (or the toolbar check) opens the pool and store and reconciles each relay with `relay.sync()` over negentropy, so only missing manifests and listings download; relay.napplet.soy advertises NIP-77. A relay without NIP-77 (relay.damus.io) or a failed negotiation falls back to a bounded REQ and is paged with `until`. The end-of-list button was removed in favour of pure infinite scroll with a status line.
- **applesauce discovery.** The first "Check for new apps" click opens an `applesauce-relay` `RelayPool` and a signature-verifying `applesauce-core` `EventStore` seeded with the snapshot, requests the newest manifests from each configured relay through the low-level `req` stream, and reports a relay finished only on its own EOSE. Listings are then requested for publishers not yet asked about. The pool is loaded lazily, so visiting or paging the saved collection contacts no relay.
- **Infinite scroll.** The saved collection reveals twelve releases at a time as the end comes into view, with a visible "Show more" control; after discovery was requested, reaching the end pages older releases with `until` until a completed page adds nothing. Search bypasses paging so every match is shown.
- **Relays and snapshot.** `wss://relay.napplet.soy` was already first in `discovery.json` and stays so. `refresh-showcase-apps.mjs` now pages manifests backwards and stores matching listings; the snapshot holds 135 manifests and 80 listings, of which 73 current-format releases render (62 are legacy aggregate releases with empty descriptions or no artifact hash, excluded as before). 47 declare icons; 76 pair with a listing.
- **One entry per napplet.** The user pointed out that snapshots (kind 5129) are version pins and were listed beside their napplet. `collapseReleases` folds them with precedence root, then named, then snapshot: a snapshot joins the addressable napplet its `a` (or `A`) lineage names, or failing lineage the same publisher's napplet with the same title; snapshots matching nothing stay independent. Groups sort by newest activity and cards show "N pinned versions". The snapshot now renders 62 napplets with no duplicate publisher-and-title pairs; 11 pins folded into 5 entries and none stands alone.
- **Cards** show an icon, art, archetype and topic chips, required and optional services, a source link and a copy-address action; the rotated monograms are gone.

## Verification

- Web units 30/30 (new coverage for lineage, title-fallback and independent-snapshot collapsing, plus for media parsing, malformed and repeated `x` fields, listing parsing, matching precedence and escaped rendering). `pnpm build` 12/12, `pnpm type-check` 19/19, core 35 and nap 197 units pass. The one CLI failure is the known local artifact (`packages/cli/.napplet/config.json`), not this change.
- `scripts/check-app-store.mjs` against the production preview: six previews and gameplay, filters, twelve-card paging with no relay contact, signed discovery with an injected release and a matching listing whose art renders and whose `javascript:` icon is dropped, deduplication, plain-text publisher metadata, older-page `until` requests, offline retry, mobile widths and no-JavaScript.
- `scripts/check-showcase.mjs` still passes for the homepage.
- Live against the real relays: `Checked 1/2 relays · 80 releases received` (relay.damus.io stays silent for these kinds and times out), auto-paging reached "That's everything we found", 39 icons verified and rendered, 29 listing images shown, no page errors.
- Pinned `aislop@0.12.0`: 98/100 with zero source findings after splitting the store module and replacing the `innerHTML` assignment with an inert `DOMParser`.

## Flagged upstream

- relay.napplet.soy publishers emit `["screenshot", <sha256>, <mime>]` rather than the current `x <sha256>` field form; under the living text those tags are malformed and are ignored here. None of the 135 live manifests uses the current form yet.
- The kind 32267 listings carry a `latest` tag naming the napplet address that neither proposal defines; it is used only as one of three non-normative matching signals.
