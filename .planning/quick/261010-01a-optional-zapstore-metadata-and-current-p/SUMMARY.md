---
status: complete
date: 2026-10-10
---

# Optional application metadata and screenshots

Implemented in `46c19178`. CLI 0.8.4 adds opt-in kind 32267 application publication, validated config, local PNG/JPEG/WebP uploads, existing image URLs, dry-run templates and signatures, and explicit metadata publication failures. Browser runner 0.3.2 supplies `napplet screenshot` through the existing package adapter, capturing a running preview shell's iframe with configurable size, delay, and readiness selector. Existing output files are preserved.

Corrected AGENTS.md's stale NIP-5A schema claim and added historical-context notices to planning documents. The actual NIP-5D text at upstream PR head `020cb8b33a9e4c6b8ca4b2f9d0ed0a67843b68f7` was consulted rather than the stale PR description. Application event tags follow the separate Software Applications proposal, upstream PR 1336. These notes are non-normative; the living sources linked in the plan govern.

Verification: `pnpm build` (all 12 tasks), `pnpm type-check`, and `pnpm -r test:unit` passed. CLI: 172 tests; browser runner: 21 tests. A real Chromium smoke test captured an `allow-scripts` sandboxed iframe at 800×600, waited for a selector inside it, verified PNG dimensions, and confirmed that repeat capture refused to overwrite the output. Slop gate: 100/100, zero errors and one function-length warning in the terminal report renderer. `git diff --check` passed.

Local media URLs use the first selected Blossom server. Failed uploads there prevent metadata publication even if another mirror succeeds. Metadata uses the deployment signer and relays, and does not publish software release/asset events or introduce an NIP-5A app pointer. Screenshot capture requires a running preview shell, Node.js 20+, and Playwright Chromium. No live application metadata was published during verification.

Follow-up: `deploy --screenshot <preview-url>` captures through the same browser runner, appends the image to enabled Zapstore metadata, and removes the temporary directory on success, capture failure, or downstream preparation failure. Config and artifact files remain untouched. Prefixed screenshot options forward iframe selection, readiness, size, and delay. Dry runs capture without publishing, and runner diagnostics use stderr. A real Chromium inline dry-run verified attachment and cleanup; all build, type and unit-test gates passed again. The pending CLI 0.8.4 release includes this follow-up.
