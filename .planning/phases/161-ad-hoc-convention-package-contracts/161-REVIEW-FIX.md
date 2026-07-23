---
phase: 161-ad-hoc-convention-package-contracts
fixed_at: 2026-07-23T17:30:23Z
review_path: .planning/phases/161-ad-hoc-convention-package-contracts/161-REVIEW.md
iteration: 2
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 161: Code Review Fix Report

**Fixed at:** 2026-07-23T17:30:23Z
**Source review:** `.planning/phases/161-ad-hoc-convention-package-contracts/161-REVIEW.md`
**Iteration:** 2

**Summary:**

- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### CR-01: Shipped plugin and refreshed authoring guidance retain invented `napplet-*` manifest protocol

**Files modified:** Vite plugin source, documentation, and tests; `packages/nap/src/config/shim.ts` and regression tests; SDK/core config documentation; conformance manifest compatibility code and fixtures; tutorial assertions; active package/site documentation; and the shim runtime guard plus its skill guidance.
**Commits:** 9442e11d, 13b89bcd, fc85f3ce
**Applied fix:** Removed protocol HTML-tag injection, all config-schema auto-discovery, obsolete metadata-only conformance compatibility, stale fixture tags, HTML metadata opt-outs, and documentation claiming HTML discovery. Preserved signed NIP-5A manifest-event behavior and explicit `config.registerSchema`; added regressions proving schemas are not read from HTML, tutorial output contains no `napplet-*` protocol metadata, and HTML metadata cannot bypass the runtime guard.

### CR-02: Conformance marks invalid and forgeable intent requests as well-formed

**Files modified:** `packages/conformance/src/validators/envelope.ts`, validator/catalog/reference-shell tests.
**Commit:** dd4819b5
**Applied fix:** Added normalized intent request validation for record shape, required identity fields, query/fragment-free matching convention, and caller-supplied `request.sender`. Catalog and reference-shell regressions now record such envelopes as invalid.

**Status:** fixed: requires human verification

### WR-01: Phase migration examples violate the newly required exact topic match

**Files modified:** `packages/sdk/src/relay.ts`, `packages/nap/src/inc/shim.ts`, `packages/nap/src/inc/sdk.ts`, and convention-contract guard/tests.
**Commit:** eed45856
**Applied fix:** Matched every paired INC subscription example to `napplet:profile/open` and added a guard for divergent queryless emit/subscribe examples.

---

_Fixed: 2026-07-23T17:30:23Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 2_
