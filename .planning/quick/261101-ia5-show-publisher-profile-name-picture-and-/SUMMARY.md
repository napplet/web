---
status: complete
---
# Publisher profiles on app store cards

Branch: `feat/store-author-profiles`, cut from `origin/main` after #294. No protocol surface changes: a kind 0 profile (NIP-01) only labels the signing key for display; the key remains the publisher identity under NIP-5D. No changeset, because `@napplet/web` is private.

## Changes

- `a8463dd3`: `authorProfile` reads a signed kind 0 event (display name, then name, trimmed to 60 characters; HTTPS picture only; a profile with neither is ignored) and `withProfiles` attaches each publisher's newest one. The card's publisher line links the key to `https://nostr.at/<npub>` and shows the picture and name, or the short key without a profile; the name joins the search text. The refresh requests kind 0 with the kind 32267 listings for the same publishers and saves them under `profiles` (and its log no longer prints `undefined` for the label count); live discovery requests both kinds for newly found publishers and renders profiles from the store. Snapshot refreshed: 649 manifests, 117 listings, 17 profiles, 201 Napshot labels (up from 6).
- `d34bf184`: a picture whose host does not answer, or is not an image, is removed so the name stands alone. The production store check routes every saved profile's picture origin to a PNG — without scripting Chromium loads all lazy images eagerly, and the no-JS pass otherwise waited on hundreds of real avatar requests.

## Verification

- `apps/web` unit tests: 57/57, including three new cases (profile parsing incl. tampered content, wrong kind, non-JSON and length cap; newest-wins per publisher; card rendering with escaped name, picture, nostr.at link and the short-key fallback).
- `node scripts/check-app-store.mjs` passes against the assembled site: every saved card links its publisher to nostr.at, saved profiles supply pictures, and after live discovery the injected publisher's card shows its profile name as text (no markup), picture and link; profiles are requested together with listings.
- `node scripts/check-app-store-napshot.mjs` passes unchanged (its fixture snapshot has no `profiles`, exercising the fallback).
- `pnpm build`, `pnpm type-check`, `pnpm -r test:unit` and `node --test scripts/refresh-showcase-apps.test.mjs` pass. aislop 0.12.0 reports only the baseline `deepmerge` advisory.
- Proof: `proof/author-profile-card.png` shows a real saved card reading "Publisher [picture] sandwich".

## Notes

A profile published after the snapshot for an already-saved publisher appears on the next refresh or when discovery meets that publisher again; cards do not look profiles up on view. Profile pictures are URL-based like listing art (`referrerpolicy="no-referrer"`, HTTPS only).
