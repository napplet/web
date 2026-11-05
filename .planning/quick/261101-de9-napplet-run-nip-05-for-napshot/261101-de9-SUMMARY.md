---
quick_id: 261101-de9
date: 2026-11-01
status: complete
---

# Summary

- Added `apps/web/public/.well-known/nostr.json` (`napshot` → `94b92a26…4f81`).
- `scripts/assemble-site.mjs` now requires it, compares the built copy with its source, and validates NIP-05 names (`a-z0-9-_.`) and lowercase hex keys (`assertNip05`). Tests are in `scripts/assemble-site.test.mjs`.
- Verified: Astro copies the dot-directory into `dist`, assembly places it at `site/.well-known/nostr.json`, and `?name=napshot` resolves from a local static server. The Bunny deploy action (readdirp) uploads dot-directories.
- Open item: Bunny does not currently send `Access-Control-Allow-Origin` on JSON. This needs pull-zone CORS configuration outside the repo.
