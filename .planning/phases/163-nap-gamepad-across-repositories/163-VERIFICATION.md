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

Final shipment review: SDK/tooling https://github.com/napplet/web/pull/242 and runtime https://github.com/kehto/web/pull/297 are open, with all five consumer/community PRs linked in COVERAGE.md. Reviewed the final shipment summary after these links were added; source and verification results are unchanged.

Release sequencing correction: primary web #242 publishes the SDK/conformance set while retaining the already-published CLI runners. Draft follow-up [#243](https://github.com/napplet/web/pull/243) changes the private runner pins and CLI version only after conformance CLI 0.3.4 and Kehto CLI 0.5.5/Paja 0.21.0 publish. Fresh-cache CI correctly rejected nonexistent future versions, which prompted this split; no provisioning test was weakened.

Reviewed the final split-release shipment summary: all eight implementation/consumer/follow-up PRs are open; original worktrees remain untouched. Required local source gates and assembled release-build controller proof remain as recorded above.
