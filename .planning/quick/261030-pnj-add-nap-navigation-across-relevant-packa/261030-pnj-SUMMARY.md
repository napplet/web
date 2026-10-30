---
status: complete
quick_id: 261030-pnj
---

# NAP-NAVIGATION implementation

Implemented report/get and runtime-maintained history across core, NAP modules, shim injection, SDK root/subpaths, Vite inference, conformance runtime, browser/CLI hosts, package exports, and active documentation/skills. Changeset covers every changed published package. Source commit: 88cf543f.

The maintainer explicitly confirmed targeting both published drafts: navigation PR126 at 778f0dc19fe2d80448b2aecfea8cef3425df82c0 and the closed/unmerged intent-delivery PR128 at 652524288c269c9acc823e041e915d1d1f891d6b. NIP-5D PR2303 remained at 6e24617cde507c0a87fa170af9ed6b2b46545b2d on final recheck. Public docs identify draft status and the breaking IntentDelivery id/null-sender change.

## Validation

- Full build: 12/12 tasks successful; type-check: 19/19 successful.
- Recursive units: core35, NAP203, shim13, SDK2, Vite99, conformance224, conformance-web9, conformance-CLI34, boilerplate8, standalone CLI254 passing with3 existing ignored cases.
- Navigation conformance coverage exercises all30 draft cases, including exact duplicate-visit correlation, rejected-report high-water ordering, late handlers, retention, isolation, and endpoint termination.
- Real Chromium test runs report/get in an opaque iframe, accepts the host-bound profile contract, rejects the reference fixture's foreign note contract, and observes no degraded-domain traffic.
- JSR export validation and11 skills contracts pass; assembled site crawl checks26 URLs without broken links.
- Pinned aislop0.12.0:98/100, no code findings. Only unchanged transitive deepmerge low advisory remains, with no available fix. No suppressions or dependency changes.
- Whitespace checks pass. No independent lint script exists; pinned scan supplies static lint/quality analysis.

## Review and simplifications

Independent review found a recording-reset lifetime regression and sparse-array allocation denial of service. Fixed both with regression tests. Reset retains live endpoint authority/history and makes dropped pending traversal uncertain. JSON arrays now validate with a short-circuit loop, avoiding allocation proportional to an attacker-controlled sparse length. Retention pruning was extracted into the existing state module to keep the history factory bounded; duplicate imports merged.

## Limits

No external production shell was tested. Draft interfaces can change upstream. Unsigned conformance runs use documented reference fixtures; signed runs use host-verified manifest metadata. No merge or package publication performed.

Shipped as open [PR #280](https://github.com/napplet/web/pull/280). Source commit88cf543f and documentation commit0e077c9e passed the recorded gates; the closing tracking commit changes only this summary and STATE.md.
