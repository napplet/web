---
quick_id: 261031-go3
status: complete
completed: 2026-10-31
---

# NAP maturity catalog and runtime policy

Shipped in [PR #288](https://github.com/napplet/web/pull/288), branch `feat/nap-maturity`, from main `932a596a`. The original Soulseek worktree and its unrelated changes remain untouched.

## Delivered behavior

Core exports a typed, frozen implementation catalog for all 26 shipped domains, metadata lookup, and a pure supported-default domain selector. Proposal state is independent of maturity; every entry has a canonical source, status check date, rationale and implementation evidence. Initial classifications are 13 supported, 11 experimental and 2 exploratory. Historical verification references are included only with evidence and explicit scope, never inferred from a fetched head.

The selector returns only candidate domains and explains exclusions. Named opt-ins cannot create support or permission; unknown/unclassified domains remain excluded. Adding an unrelated experiment does not enable it through an existing named opt-in.

The side-effect-free shim prelude accepts optional maturity policy while preserving legacy explicit allowlists. Legacy root imports remain permissive; a later explicit prelude replaces their namespace before subject scripts. Reference browser boot uses the selected set for both injection and host dispatch, and endpoint grants cannot widen that ceiling. Normal conformance mode retains all domains and unchanged protocol validation.

Documentation and protocol directory labels render directly from the catalog. Turbo cache inputs include the catalog and renderer, and docs output restoration includes `.vitepress/dist/**`, preventing stale labels after metadata-only changes. The guide covers supported-only and named opt-in examples, legacy behavior, host enforcement, required/optional domains, changing APIs, and provenance limits. The adjacent protocol directory's stale NIP-5A manifest link was corrected to NIP-5D.

## Verification

- `pnpm build`: 12/12 tasks pass.
- `pnpm type-check`: 19/19 tasks pass.
- `pnpm -r test:unit`: passes, including real Chromium policy/bypass cases and 254 CLI cases; three existing CLI cases remain ignored.
- `pnpm test`: passes, including release tooling, JSR exports, protocol generation, skills contracts and tutorial conformance.
- `pnpm test:workflow-contracts`: 14/14 pass.
- Pinned AI-slop 0.12.0 full scan: 100/100, zero diagnostics. No rule or configuration changes.
- Twelve built-page checks at 1440px/390px pass with rendered maturity labels and no page overflow.
- Built package imports work in Node without a browser global. Git whitespace checks pass.

The requirement-by-requirement audit is in `261031-go3-VERIFICATION.md`. Evidence logs and screenshots are under `/tmp/nap-maturity-evidence/`. Hosted checks were running when the shipment record was created; local checks above are completed results.

## Release metadata

Changesets were committed, then consumed with `pnpm version-packages`. Prepared versions: core 0.36.0, shim 0.34.0, conformance 0.22.0, conformance-cli 0.4.2, nap 0.35.1, SDK 0.31.1, vite-plugin 0.16.4. The version step also consumed the existing main conformance-prelude changeset. No local publication or merge was performed.

## Commits

- `dcfd1578`: catalog, lookup, selector and core tests.
- `c2fd3643`: shim, reference-host enforcement and browser tests.
- `7a001162`: generated documentation labels and usage guidance.
- `5da4f296`, `9d848222`, `f67cc43a`: changesets and synchronized release metadata.
- `18d636cf`: scoped historical verification provenance.
- `d9e9fe40`: implementation and release requirement audit.

No protocol negotiation, manifest field, wire message, injected metadata member, runtime GitHub access, separate experimental package, or release channel was introduced. Production hosts still own endpoint authentication and operation-level authorization; maturity is not a security or compatibility guarantee.
