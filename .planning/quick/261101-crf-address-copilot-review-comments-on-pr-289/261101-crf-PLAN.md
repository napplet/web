---
quick_id: 261101-crf
slug: address-copilot-review-comments-on-pr-289
date: 2026-11-01
mode: quick
---

# Address the Copilot review on PR #289 (Napshot store fallbacks)

Copilot left eight inline comments on `feat/napshot-store-screenshots` (PR #289). All are website robustness issues around the Napshot preview feature; none touch NIP-5D or NAP surface, and none require inventing protocol. The Napshot label remains napplet/napshot's display-only NIP-32 profile; wording changes follow its published wire contract (capture-mode content strings).

## Tasks (one per review comment)

1. **`media.ts` redirect (comment 1).** Fetch mirror bytes with `redirect: 'error'`. The default `follow` mode makes the browser request the redirect destination before `response.url` can be checked, so a public mirror could aim the visitor's browser at a private host. Browsers cannot validate a redirect hop before following it, so redirects are refused outright instead; the post-hoc `response.redirected` re-check goes away with the exposure it pretended to cover.
2. **Shared screenshot eligibility (comment 3).** Add `usableScreenshot(app)` in `media.ts`: the first author screenshot whose declared type the renderer can decode (or is undeclared, letting the bytes decide) and whose mirror URL passes the fetch policy. Use it in `withNapshot`, `previewTargets` and `card.ts` data-media, so an `image/svg+xml` or server-less screenshot no longer blocks a valid Napshot label and leaves the card blank.
3. **Label discovery coverage (comments 4 + 5, `store.ts`).** Compute label targets from every manifest the store knows (saved snapshot included), not only the current sync's returns; batch them (`#e` ≤ 50) and page any relay response that comes back full with `until` so candidates are never silently dropped. Track queried targets per session so later passes only ask about new ids.
4. **Snapshot refresh durability (comments 5 + 8, `refresh-showcase-apps.mjs`).** Page label batches with `until` until short, merge previously saved labels (still valid for their own revisions) so a partial pass cannot remove previews, and abort the refresh — leaving the existing snapshot intact — when a label batch completes on no relay. Extract the label pass into a testable helper with a `node --test` suite.
5. **Capture-mode wording (comment 6, `napshot.ts`/`store.ts`).** Parse the capture mode from the label's signed content per napshot's wire contract: `signed-out`, `preview-identity`, or unspecified. Alt text and the art-source tooltip follow the mode instead of asserting every preview was captured signed out.
6. **Refresh-proof saved-snapshot unit test (comment 2, `napshot.test.ts`).** Replace the exact count ("every saved label renders") with invariants: every saved label comes from a configured signer, and every attached preview is bound to an eligible non-snapshot revision with its own saved label. The snapshot may legitimately carry labels for releases that keep author screenshots.
7. **Dedicated browser fixtures (comment 7, `check-app-store.mjs`).** Stop pinning Conway's capture hash, its committed PNG and the SeedHammer label id. A new `check-app-store-napshot.mjs` phase swaps in fixture data (fixture signer in `discovery.json`, fixture manifests/labels, generated PNGs), serves the site through the existing dev-server helper, and deterministically exercises: redirect refusal with a private-host redirect target, wrong-bytes fall-through, oversized/500 placeholder, author-screenshot and listing-art precedence, both capture modes, and label batching/paging over the saved fixture collection. The production check keeps evolution-proof assertions (untrusted live label ignored, batched `#e` targets, `until` paging, saved entries included) derived from the snapshot instead of pinned to it. Delete the committed real-capture PNG fixture.
8. **Docs and state.** Sync `apps/web/README.md` and the /apps "About this collection" copy (mode-aware wording, redirect refusal, batching), add the new check script to the link-check workflow paths, and record this quick task in STATE.md.

## Verification

Web unit tests, `pnpm type-check`, `pnpm build`, `pnpm -r test:unit`, the restructured `check-app-store.mjs` (production + fixture phases) against a locally built site, a mutation check of the redirect refusal, and the AI-slop gate. No changeset: `@napplet/web` is private and ships nothing.
