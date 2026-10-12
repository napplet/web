---
quick_id: 261006-ij3
status: complete
date: 2026-10-06
branch: feat/nip5d-event-schema
---

# Quick 261006-ij3: Fix verified PR #224 review findings

Note: the original PLAN.md and executor SUMMARY.md were missing from this directory when the docs commit ran (cause not determined). This summary was reconstructed by the orchestrator from the executor's hand-back report.

## Commits

- f78f79b7 fix(cli): report manifest errors from napplet debug
- 04306ab7 fix(cli): fail current deploys that would drop built files
- 5f395991 fix(cli): let optional domains win over required duplicates
- 37131e3d fix(vite-plugin): explain missing index.html and external-assets coverage
- 75da7716 fix(conformance-web): show the artifact x hash and optional domains
- a4f1c8b4 docs: describe deploy, debug and artifact-mode guards

## Changes

- F4: `createDebugReport` catches manifest-template errors into `manifests.error` / `manifests.format`; `napplet debug --format current|legacy`.
- F2a: current-format deploy throws, listing files, when anything besides `/index.html` and icon blobs would be dropped (NIP-5D §Manifest: "A napplet is a single self-contained `/index.html`"). Mirrors the vite-plugin's pre-existing single-file assertion.
- F3: CLI drops `R` tags whose domain also has an `O` tag, matching the vite-plugin. No conformance check (NIP-5D does not make overlap an error).
- F2b: vite-plugin errors clearly on missing `dist/index.html`; `external-assets` mode warns that the `x` hash covers only `index.html`. `isNapDomain` renamed `assertBareNapDomain` (no behavior change).
- F1: conformance web inspector shows `artifact hash (x)` and `optional` rows via new `manifestRows`.

## Release decision

No new changeset: CLI 0.7.0, vite-plugin 0.15.0 and conformance-web 0.0.19 are already prepared on this branch and unpublished; notes were added under those CHANGELOG entries.

## Verification

- `pnpm build`: 12/12 tasks successful
- `pnpm type-check`: 17/17 tasks successful
- `pnpm -r test:unit`: all green (cli 141, conformance 77, vite-plugin 34, conformance-web 9, …), re-run by orchestrator
- aislop 76/100 against base 2127bde0; remaining findings pre-existing (dependency advisories, `cli.ts` size)
- `deno fmt --check` still fails on 7 CLI files that were unformatted before this task
