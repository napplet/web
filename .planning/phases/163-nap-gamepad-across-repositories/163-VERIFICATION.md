---
phase: 163
status: passed
verified: 2026-10-12
---

# GAMEPAD verification

Non-normative implementation evidence against the current living NAP-GAMEPAD and NIP-5D sources linked in CONTEXT.md. Canonical heads and organization inventory were rechecked unchanged.

| Acceptance reference | Proof | Result |
| --- | --- | --- |
| GP-API | Core types/domain, NAP binding, built SDK root/subpath import tests, npm/JSR exports, selected shim, synchronous cached access and independent listeners. | Passed |
| GP-WIRE | Three message discriminants/directions, no correlation ids, full state, ranges, mappings, null slots, unavailable and neutral views; reference mock and serialized injection tests. | Passed |
| GP-ISOLATION | Kehto broker units and Chromium prove live/neutral frame isolation, host/tab focus loss, native controller denial, connection updates, polling/rate/session cleanup. | Passed |
| GP-TRUST | Parent-source checks, trusted creation/prebound sessions, frozen domain environment, disabled-domain/unknown-source rejection, no SHELL prerequisite. | Passed |
| GP-REPOS | All seven organization repos, all web packages/apps/fixtures, and Kehto runtime dependencies inventoried in COVERAGE.md; appropriate changes and explicit unchanged surfaces recorded. | Passed |
| GP-DOCS | Package/site/skill/template guidance, consumer/migration/CVM/organization docs, current manifest schema, controller fallbacks and focus-edge guidance. | Passed |
| GP-SHIP | Primary build/types/recursive units/docs/slop; applicable consumer gates; source-build compiled CLI screenshot/Paja proof; release metadata and linked PR shipment. | Passed with disclosed existing CVM baseline failures |

Native API replacement remains deferred for the disclosed optional-projection/NIP-5D injection conflict. No new protocol surface is fabricated. CVM full-suite protected authority failures also occur on untouched main; controller-specific tests pass. Kehto's prospective 0.34 package matrix deliberately uses temporary packed source builds; distribution guards reject those overrides, which are never committed. Release order remains Kehto CLI 0.5.5/Paja 0.21.0 before the napplet package set. No production deployment or image promotion is performed.
