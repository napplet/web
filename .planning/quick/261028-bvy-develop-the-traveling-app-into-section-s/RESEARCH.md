# Sources and decisions

Non-normative implementation notes, reviewed 2026-10-28. The living [NIP-5D proposal](https://github.com/nostr-protocol/nips/pull/2303) and [NAP track](https://github.com/napplet/naps) remain authoritative.

Read `5D.md` from PR head `5560820fa4f37f45b8ab742a11aeb3001b17dc67`, not its description or NIP-5A. Identity and Manifest define kinds 5129 / 15129 / 35129, a single direct artifact `x`, and plain-text description content. The catalog uses those fields, without adopting historical path/aggregate schemas. Refreshed all 44 NAP entries through the existing generator from upstream `5aadf1b` on 2026-10-28. The renderer preserves source attribution and living links.

## Shell directory evidence

- [Amethyst README](https://github.com/vitorpamplona/amethyst#readme) lists Android and native macOS, Linux, Windows installers. Its current source tree contains the napplet host, consent and storage modules. Labels describe platforms, not certification of all build variants.
- [Myco README](https://github.com/Origami74/myco#readme) explicitly lists Android and Android TV, nearby app sharing and offline reopening. No desktop platform is claimed.
- [noStrudel source](https://github.com/hzrd149/nostrudel) contains napplet host/UI and `.changeset/user-napplets-tab.md`, describing user profile discovery and direct opening. Link to the actual web application.
- [Grimoire source](https://github.com/purrgrammer/grimoire) and `docs/napplets.md` describe a tiling workspace and current napplet integration. The web application responds at grimoire.rocks.
- [Dryft README](https://github.com/sandwichfarm/dryft#readme) identifies an in-development TV shell, web UI and verified Debian graphical builds. Do not imply a finished cross-platform release.
- Existing napplet.soy and Paja remain available web destinations with their previous source links.

## Signed apps and defects surfaced

The opt-in relay query returned 80 authentic signed events from relay.napplet.soy for the saved collection. Catalog selection yields 37 direct-hash releases after local filtering and address deduplication. Real browser discovery later completed both configured relays and expanded the collection to 62 entries. Counts describe observations, not a fixed network inventory.

The titles of the three original demos appear in that query, but their events remain historical aggregate-hash releases. An initial inference that they were current was disproved by inspection and corrected to the user. They retain archive labels and their explicitly selected private adapter. Never manufacture replacement signatures.

Stick Brawl, Freeze Frame Response and Poly Dogfight have signed direct artifact-hash releases, no required services, downloadable exact artifacts and MIT-licensed source archives. Fetched and verified all three artifacts and source license notices. Their current `source` tags use `nostr://` locations outside NIP-5D's defined Source formats. This is an upstream metadata defect, explicitly flagged to the user and in the catalog details, README and notice. Source links use existing HTTPS archives; signatures remain unchanged. Identity verification and catalog selection do not claim full manifest or NAP conformance and do not redefine those metadata formats.

A live external check found napplet.soy's named-app `/n/` route rejects `nevent` snapshots with its 404 screen. Named entries were verified to open a real application detail page. The catalog now routes named addresses to that supported shell route and other releases to their signed event, with an address-copy action for other shells.

## Visual direction

The rejected four-circle image is replaced by the recognizable Freeze Frame Response app window. Its purpose changes: open a collection, inhabit desktop then phone, connect to services, become an empty canvas. The same desktop element moves through measured anchors and stops with each illustration. Small screens animate local instances; reduced motion and no-JavaScript use the static illustrations. Source anchors are not transformed by reveal animations. Their document positions are sorted before constructing the journey.

GSAP timelines synchronize the collection fan, host masks, service wire drawing, canvas morph and content reveals. Normal browser scrolling remains in control. The social preview now uses the actual app too.

The homepage and social card now spotlight a direct artifact-hash release, Freeze Frame Response. The three current-format selections lead the curated list; legacy releases remain labeled archives in the app store. The public default experience does not use the archive adapter.
