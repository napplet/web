---
status: complete
quick_id: 261030-pog
requirements: [CATALOG-PACKAGES, CATALOG-DOCS, CATALOG-TESTS, CATALOG-PR]
---

# NAP-CATALOG package support

Implemented in isolated branch `feat/nap-catalog`, based on `origin/main` at `f6839146`. PR: https://github.com/napplet/web/pull/275. Implementation commits: `dea4c44c` and `b1933bd0`; plan: `81166a73`.

## Delivered

- Core catalog schemas and optional domain; layered NAP exports; SDK root and catalog subpath; allowlisted runtime injection with parent-source checks, correlation, errors, timeout, and idempotent disposal.
- Reference catalog built from host-verified, loadable manifests, with shared intent selectors, caller filtering, complete descriptors, role-less entries, and null unavailable handlers. Envelope validators and Vite requirement inference recognize the two catalog messages and bare domain.
- Package READMEs, docs guide/navigation, and SDK/interop skills updated. Generated release metadata through `pnpm version-packages`, including JSR imports and tutorial SDK ranges. Preserved historical changelog formatting.

## Evidence

- `pnpm build`: 12/12 tasks passed.
- `pnpm type-check`: 19/19 tasks passed.
- `pnpm -r test:unit`: 842 passed; 3 existing CLI tests ignored. Changed package totals: core 37, nap 204, shim 12, SDK 2, conformance 185, Vite plugin 98.
- `pnpm check:jsr`: all exports exist and are publish-included.
- `pnpm test:release-tooling`: 4 passed; `pnpm test:skills-contracts`: 11 passed.
- Docs production build passed; assembled-site browser crawl checked 26 internal URLs without broken links.
- `aislop@0.12.0 scan --json .`: 98/100, zero code findings, zero errors. Existing low-severity deepmerge advisory remains; no dependency changes or scanner rule changes.
- Independent review found malformed percent-encoded convention advertisements. Shared parsing now rejects malformed escapes and whitespace while retaining valid encoded identities exactly. Focused catalog regression tests passed after the fix.
- Tests exercise public npm exports, three manifest kinds, complete metadata, role-less entries, hidden selected handlers, resolver-free access, errors, timeout/disposal, spoofed sources, and the maintained IIFE request/result round-trip.

## Protocol and limits

This is non-normative implementation evidence for the living [NAP-CATALOG proposal](https://github.com/napplet/naps/pull/95), reviewed and rechecked at `1020ae53884a177b7ffc58a679126bc8800d0c6d`, and [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303), reviewed at `6e24617cde507c0a87fa170af9ed6b2b46545b2d`. The draft may evolve. Production hosts retain signature/artifact verification, complete required-domain compatibility, and authorization. No production runtime, publication, or merge was performed. The original working checkout was not edited by this task.
