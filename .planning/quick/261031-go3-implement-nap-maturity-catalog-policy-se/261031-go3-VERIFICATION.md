---
quick_id: 261031-go3
status: passed
verified: 2026-10-31
---

# NAP maturity verification

This is non-normative implementation evidence. The living [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) and [NAP repository](https://github.com/napplet/naps) remain authoritative. NIP-5D was read from `5D.md` at PR head `6e24617cde507c0a87fa170af9ed6b2b46545b2d`, including Transport, Required and Optional Capabilities, Runtime Domain Availability, and NAP Extension Framework. The relevant published proposal texts and actual GitHub PR state/draft/merge records were fetched on 2026-10-31; catalog links identify each source. No source text was copied into this implementation catalog.

## Requirement audit

| Requirement | Current evidence | Result |
| --- | --- | --- |
| Preserve unrelated work and start from current default branch | Isolated `feat/nap-maturity` worktree based on origin/main `932a596a`; original `feat/nap-soulseek` tree still has exactly its initial tracked changes (deno.lock +67 lines; package.json +2/-1) and original untracked paths. | Pass |
| Use GSD with autonomous routine decisions | `261031-go3-PLAN.md`, inline execution, atomic commits, this audit, summary and state record. No new planning interview or agent delegation. | Pass |
| Separate proposal status and implementation maturity | `nap-catalog.ts` has independent typed fields, canonical proposal URLs, status check dates, rationales and evidence. 26 shipped domains: 13 supported, 11 experimental, 2 exploratory; upstream: 5 merged, 18 in review, 3 draft. | Pass |
| Cover shipped domains without a competing registry | Catalog satisfies `Record<NapDomain, NapImplementationMetadata>` against the existing domain type; test compares catalog keys exactly to `NAP_DOMAINS`. Soulseek is unmerged and absent from this main-based shipped domain set. | Pass |
| Honest provenance and no invented verification SHA | Optional scoped historical references only for GAMEPAD and the verified RELAY/RESOURCE/OUTBOX sidecar migration, each linked to an existing verification artifact. Other missing revision evidence is omitted. Status date is explicitly not compatibility verification. | Pass |
| Published proposals and retirement | All catalog domains have active published source proposals or merged text. Reopened RESOURCE #80 and GAMEPAD #130 are classified in review. No deferred CLASS/CONNECT surface was added; CONFIG's MAY DEFER is not misrepresented as a completed deferral. | Pass |
| Small typed package API preserving imports | Core exports `NAP_IMPLEMENTATIONS`, `getNapImplementation`, `selectNapDomains` and their types. Built ESM imports work from Node with no window. Existing exports remain. | Pass |
| Explicit candidates, supported default, named opt-ins | `nap-maturity.test.ts`: supported subset, both opt-in tiers, empty candidates/levels, explicit levels, deduplication, order and input immutability. | Pass |
| Never manufacture support or permission | Opt-ins absent from candidates cannot be selected. Reference host intersects endpoint grants with an independently snapshotted host ceiling. | Pass |
| Unknown/unclassified excluded | Unit vectors include unknown names, prototype names, missing/null/invalid maturity, even when explicitly opted in. | Pass |
| Upgrade isolation | `nap-maturity-upgrade.test.ts` models a later catalog with a new experimental domain; the existing named opt-in does not select it. | Pass |
| Safe shim integration and compatibility | Prelude preserves explicit allowlists without maturity; optional policy is resolved before serialized activation. Import test proves no implicit installation. Legacy root still installs all; explicit prelude replaces its namespace. | Pass |
| Before-script availability and direct-message enforcement | Real Chromium tests assert exact namespace during classic and module execution, reject direct LLM attempts under supported-only policy, and complete select/describe with named LLM opt-in. Unit host tests cover dispatch and endpoint intersection. | Pass |
| Consistent owned host integration | `bootAndCollect` sends the resolved set to both prelude and reference shell. Its degraded boot now also denies direct messages to absent domains. | Pass |
| Conformance stays separate | Default conformance runs still expose all domains. Excluded but structurally valid envelopes stay valid and recorded. No validator/check was weakened or supplemented with a maturity conformance rule. | Pass |
| Documentation from one catalog | VitePress renderer and Astro component read catalog source directly. Docs tests verify overview rows, per-domain labels before examples, proposal links and check dates. | Pass |
| Documentation cache stays synchronized | Turbo global cache inputs include the catalog, selector and Markdown renderer; docs build outputs include `.vitepress/dist/**`. A real Turbo dry-run confirmed those file hashes and output paths. | Pass |
| Clear labels and practical examples | Maturity guide, core/shim/conformance package docs, README links: all can change, supported is not frozen, experimental does not waive conformance; supported-only and named LLM opt-in examples; legacy caveat and host dispatch responsibilities. | Pass |
| Required/optional capability semantics | Non-normative guide follows NIP-5D's complete R-set check, reject-or-warn guidance, optional-domain loading rule and namespace availability. No declaration grants authority. | Pass |
| No protocol surface or unnecessary infrastructure | Diff adds no wire messages, manifest/HTML tags, window.napplet metadata, handshake, negotiation, runtime status fetch, separate experimental package or release stream. | Pass |
| Flag/correct encountered protocol guidance defect | Adjacent protocol directory manifest card incorrectly cited NIP-5A; corrected to current NIP-5D and surfaced in progress/PR notes. | Pass |
| Rendered docs | Twelve built-page browser checks at 1440px/390px: docs overview, LLM, GAMEPAD, maturity guide, protocol directory and STORAGE detail; all HTTP 200, maturity content present, no document overflow. Mobile LLM screenshot inspected. | Pass |
| Required checks | `pnpm build` 12/12; `pnpm type-check` 19/19; `pnpm -r test:unit`; `pnpm test`; `pnpm test:workflow-contracts` 14/14; `git diff --check`. | Pass |
| AI-slop gate | Pinned scanner 0.12.0 final full scan: 100/100, zero diagnostics, 356 supported files. Core/runtime/docs checkpoint scans also 100. No configuration or rule changes. Base has no `.aislop/config.yml`; used the workflow's pinned version unchanged. | Pass |
| Release metadata | Changesets authored and consumed via `pnpm version-packages`; npm/JSR versions and changelogs synchronized; JSR export and release-tooling checks pass. Existing main conformance-prelude changeset consumed as part of the release. | Pass |
| Commit, push and open PR | Branch pushed; PR #288 is OPEN and MERGEABLE, with the implementation head verified against GitHub. Summary records the shipment. | Pass |

## Test evidence and limitations

Final recursive units: core 43, nap 219, shim 17, conformance 217, conformance CLI 36, vite-plugin 99, web 33, conformance web 9; CLI Deno suite 254 passed with three existing ignored cases. The SDK's Node test suite also passes. `pnpm test` additionally passes JSR exports, protocol generation, release tooling, skills contracts, tutorial build and tutorial conformance. Tutorial conformance reports 6 passed, 0 failed, 6 explicitly skipped checks for unavailable manifest/lifecycle evidence; skipped checks are not counted as passes.

Evidence logs and screenshots are in `/tmp/nap-maturity-evidence/` on the implementation machine. The source tests and catalog coverage checks are committed for reproduction. Earlier local attempts hit concurrent build-output cleanup and test-only Window typing errors; both were corrected and the final sequential build/type/unit/test chain passed. An initial browser verification used an incorrect guessed STORAGE URL; rerunning against the actual generated `nap-storage-pr-3` route passed. These were verification setup failures, not ignored product failures.

Shim filtering remains a convenience; production hosts must enforce endpoint identity, the selected domains and operation-specific authorization. Legacy root imports remain permissive by explicit compatibility choice. Classifications are reviewable release-time assessments and may change. Neither metadata nor historical references prove the semantics of a remote shell. No packages were published locally and no PR merge is part of this task.
