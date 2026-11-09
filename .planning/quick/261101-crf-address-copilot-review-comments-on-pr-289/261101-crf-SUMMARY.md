---
quick_id: 261101-crf
slug: address-copilot-review-comments-on-pr-289
date: 2026-11-01
status: complete
---

# Summary: address the Copilot review on PR #289

All eight inline Copilot comments on `feat/napshot-store-screenshots` were addressed, shipped as a stacked branch on top of the PR head so #289 stays untouched:

- **Redirect (media.ts).** Mirror bytes are fetched with `redirect: 'error'`: the default follow mode requests the redirect destination before `response.url` can be checked, so a public mirror could aim the visitor's browser at a private host. The post-hoc `response.redirected` recheck went away with the exposure it pretended to cover.
- **Shared eligibility (media.ts, napshot.ts, card.ts).** `usableScreenshot` selects the first author screenshot the renderer can actually fetch and decode; `withNapshot`, `previewTargets` and card `data-media` all use it, so an `image/svg+xml` or server-less screenshot no longer blocks a valid label and leaves the card blank.
- **Label discovery (store.ts).** Targets come from every manifest the store knows (saved snapshot included), batched (`#e` ≤ 50) and run concurrently, with any full relay page paged via `until`; queried targets are marked only after a batch settles so an aborted pass re-asks them.
- **Capture mode (napshot.ts, store.ts).** The mode (`signed-out`, `preview-identity`, or unspecified) is read from the verified label's signed content — the wire contract's two known strings — and the alt text and art-source tooltip follow it instead of asserting every capture was signed out.
- **Snapshot refresh (refresh-showcase-apps.mjs).** Label collection moved into a pure, injected-request helper (`scripts/lib/napshot-labels.mjs`, `node --test` suite) that batches, pages with `until`, keeps previously saved trusted labels so a partial pass cannot drop shipped previews, and lets the script abort with the existing snapshot intact when no relay completes a label batch. Wired into `pnpm test` as `test:showcase-refresh`.
- **Saved-snapshot unit test (napshot.test.ts).** Replaced the "every saved label renders" count (which a future refresh of a release that gains an author screenshot would break) with invariants: labels come from configured signers, are bound to eligible non-snapshot revisions, never overlap a usable screenshot, and ineligible revisions never carry a preview. Kept the 30 s CI timeout.
- **Browser checks (check-app-store.mjs, check-app-store-napshot.mjs).** The production check no longer pins Conway's capture hash, its committed PNG or the SeedHammer label id; it now asserts coverage derived from the snapshot (batched targets include every plainly eligible saved release and new discoveries, untrusted live labels ignored). The deterministic scenarios moved to a new fixture phase that rebuilds /apps/ from generated data (fixture signer, signed fixture manifests/labels, generated PNGs) and serves it locally. Redirect refusal is proven against a real local HTTPS mirror issuing the 302 (route-fulfilled 3xx is never followed by the browser, and a CORS-mode fetch needs ACAO headers on the redirect to follow at all); the committed real-capture PNG fixture was deleted. A mutation check (redirect refusal removed) fails the fixture check as expected, and the code was restored.
- **Docs.** `apps/web/README.md`, the /apps "About this collection" copy (mode-aware wording, redirect refusal) and the link-check workflow paths were synced.

No changeset: `@napplet/web` is private and ships nothing to npm/JSR.

Verification: web vitest 44/44 and every package's `test:unit` green (848 tests across the repo); `node --test scripts/refresh-showcase-apps.test.mjs` 5/5; `pnpm type-check`, `pnpm build` green; `check-app-store-napshot.mjs` passes and the mutation run fails on the exact redirect assertion; `check-app-store.mjs` passes against the real built site; aislop 98/100 (the only warning is the pre-existing `deepmerge` advisory). Deviation from the plan: the fixture phase builds the site statically and serves it with `node:http` (matching CI's `python3 -m http.server`) instead of the dev-server helper, so no dev servers are left running.

The stacked branch `fix/pr-289-copilot-review` was pushed with a PR targeting `feat/napshot-store-screenshots`; Copilot's review was re-requested there.