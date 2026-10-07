---
quick_id: 261007-aae
status: complete
date: 2026-10-07
branch: feat/nip5d-event-schema
---

# PR #224 integration with #223

Merged main at `39a1e4ac` into the existing PR branch in merge commit `cc741b8f`. Resolved eight textual conflicts and adapted automatically merged tests to the current artifact-hash schema. The unrelated dirty main worktree was left untouched.

Preserved explicit unknown domain declarations and build warnings, restricted inference to known domains, retained optional-domain precedence, and exposed the registry advisory through the conformance catalog for both R and O tags. Legacy sidecar requirements are trimmed and empty entries ignored before conversion; both deployment formats retain unknown non-empty declarations. Regression tests prove warnings never fail the run, optional inference does not trigger missing-required errors, and repeated transforms do not duplicate warnings.

## Protocol decision

The live [NIP-5D Required and Optional Capabilities](https://github.com/dskvr/nips/blob/nip/5d/5D.md#required-and-optional-capabilities), verified at PR #2303 head `020cb8b33a9e4c6b8ca4b2f9d0ed0a67843b68f7`, requires bare domains and reserves runtime availability to shell policy. #223's lowercase-only regex has no cited canonical requirement, so it was not propagated. The existing permissive naming behavior remains, with domain.action values rejected as operations rather than bare domains. Registry knowledge remains an advisory, never proof of support. This record is non-normative; the living NIP and NAPs remain authoritative.

## Release metadata

Consumed #223's three pending changesets into the already-prepared unpublished CLI 0.7.0, conformance 0.18.0, and vite-plugin 0.15.0 changelog entries. No extra version increment or local publication. Updated package READMEs and docs to describe R/O declarations and advisory warnings.

## Verification

- `pnpm build`: 12/12 tasks passed.
- `pnpm type-check`: 17/17 tasks passed.
- `pnpm -r test:unit`: 533 tests passed, including CLI 144, conformance 95, and vite-plugin 41.
- `pnpm test:tutorial`: extraction/build and real Chromium conformance passed; 5 passing checks, 0 failures, 6 expected skips where no manifest, wire traffic, or lifecycle measurements exist.
- `pnpm check:jsr`, `pnpm test:release-tooling`, `pnpm test:skills-contracts`, `pnpm test:convention-contracts`, and `pnpm test:workflow-contracts`: passed.
- Pinned AI-slop 0.12.0: 75/100, above the unchanged CI threshold 70 with `fail-on-error: false`. Findings are two pre-existing CLI file-size warnings and four dependency advisories; no rules or dependency versions were changed for this conflict resolution.
- No unmerged index entries; staged diff passes whitespace checks.

Delivery uses the existing [PR #224](https://github.com/napplet/web/pull/224), without rewriting branch history.
