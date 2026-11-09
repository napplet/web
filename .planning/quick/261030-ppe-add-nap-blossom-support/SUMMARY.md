---
status: complete
---

# NAP-BLOSSOM package support

Implemented in `d4147798`, shipped for review in [PR #276](https://github.com/napplet/web/pull/276) from the isolated `feat/nap-blossom` worktree. The original showcase checkout and its unrelated edits were preserved.

## Delivered

- Core records, optional `NappletGlobal.blossom`, domain routing and public types.
- NAP module with all thirteen request/result pairs, operation-plus-ID correlation, native binary payloads, typed failures, timeout and explicit cleanup. Local BUD-10 URI helpers use published examples.
- SDK namespace, prefixed helpers, ergonomic subpath exports and npm/JSR/build maps; opt-in shim injection and parent-source filtering.
- Conformance envelope validation, honest unavailable reference responses, and maintained-prelude tests. The minimal fallback keeps unsupported domains absent.
- Vite inference, CLI required/optional declaration regression coverage, public docs, skill guidance and seven package changesets. No new dependencies.

This is non-normative implementation evidence. Canonical sources reviewed: NAP-BLOSSOM PR #71 at `5e74daa4808290a3efb8de117502d52ba2e0d2a5`, NIP-5D PR #2303 at `6e24617cde507c0a87fa170af9ed6b2b46545b2d`, and live BUD-10. The living documents govern the protocol.

## Verification

- `pnpm build`: 12/12 tasks passed, including all five standalone CLI targets and docs.
- `pnpm type-check`: 19/19 tasks passed.
- `pnpm -r test:unit`: 876 passed, 3 existing CLI tests ignored. Counts: boilerplate 8, core 35, nap 235, CLI 255, SDK 2, Vite 100, shim 12, conformance 186, conformance web 9, conformance CLI 34.
- Chromium exercises Blob and ArrayBuffer requests across an opaque-origin iframe, typed failure responses, local URI helpers and domain-absent fallback.
- JSR export validation, 11 skills contracts and 4 release-tooling tests passed. The assembled site has 26 checked internal URLs with no broken links.
- Pinned `aislop@0.12.0` scan: 98/100, zero code findings. The unchanged dependency graph has a low-severity `deepmerge` advisory with no available fix. Workflow threshold is 70; no rule was disabled.
- Independent source/security review found no blocking issues. A teardown documentation overclaim was corrected. A stale comment claiming RESOURCE was the only byte-fetch interface was also corrected.
- A first overlapping build/type-check attempt raced on generated declaration cleanup; sequential full checks subsequently passed. A final whitespace-only correction was followed by 38/38 focused Blossom tests and a clean staged diff check.

## Boundaries

The reference shell does not provide a live Blossom backend. HTTP restrictions, signing, authorization, integrity verification, SSRF protections and live server-list publication remain host responsibilities and were not tested against external services. The NAP remains a draft. No release or merge was performed.
