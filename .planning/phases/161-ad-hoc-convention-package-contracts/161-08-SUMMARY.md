---
phase: 161-ad-hoc-convention-package-contracts
plan: "08"
subsystem: package-documentation
tags: [readmes, conventions, nap-intent, inc, cli, nip-5a]
requires:
  - phase: 161-01
    provides: Convention-only NAP-INTENT public types
  - phase: 161-02
    provides: Exact opaque INC topic-routing behavior
  - phase: 161-03
    provides: Exact three-element archetype manifest tags
  - phase: 161-04
    provides: CLI slug-plus-convention config parsing
  - phase: 161-05
    provides: Convention-agnostic conformance behavior
provides:
  - Convention-current root and package README guidance
  - Local-payload and exact-topic explanations without invented matching semantics
affects: [authoring, cli, vite-plugin, conformance, nap-intent, inc]
tech-stack:
  added: []
  patterns:
    - One archetype tag documents one role slug plus one opaque convention.
    - Documentation labels convention payloads as local choices and retains exact string delivery.
key-files:
  created: []
  modified:
    - README.md
    - packages/boilerplate/README.md
    - packages/cli/README.md
    - packages/conformance/README.md
    - packages/conformance-cli/README.md
    - packages/core/README.md
    - packages/nap/README.md
    - packages/sdk/README.md
    - packages/shim/README.md
    - packages/vite-plugin/README.md
key-decisions:
  - Replace retired numbered archetype examples with one opaque convention per role declaration.
  - Keep convention payloads, query text, and matching semantics outside package documentation unless defined by a living upstream specification.
requirements-completed: [CONV-PKG-05]
coverage:
  - id: D1
    description: Root and package READMEs teach the convention-only model and current CLI config shape.
    requirement: CONV-PKG-05
    verification:
      - kind: other
        ref: "targeted retired-example scan across all ten README files"
        status: pass
      - kind: other
        ref: "pnpm --filter @napplet/docs build"
        status: pass
    human_judgment: false
  - id: D2
    description: README examples keep INC payloads and convention matching as local opaque choices.
    requirement: CONV-PKG-05
    verification:
      - kind: other
        ref: "manual README review against napplet/naps@6461e4b ARCHETYPES.md and Plans 161-01 through 161-05"
        status: pass
    human_judgment: false
duration: 12min
completed: 2026-07-23
status: complete
---

# Phase 161 Plan 08: Convention Package Documentation Summary

**The root and ten active package READMEs now document opaque archetype conventions, exact INC topic delivery, and local payload choices without reviving numbered-NAP negotiation.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-23T14:17:36Z
- **Completed:** 2026-07-23T14:29:36Z
- **Tasks:** 1/1
- **Files modified:** 10

## Accomplishments

- Replaced retired CLI archetype contracts, `slug:NAP-N` flags, and serialized `protocol` metadata with role-plus-convention guidance and the current config shape.
- Documented the three advisory convention names, `napplet:note/open`, `napplet:profile/open`, and `napplet:dm/open`, as opaque values with receiver-owned local payload validation.
- Aligned manifest, conformance, SDK, shim, core, NAP, root, and boilerplate guidance with the shipped convention-only contracts while preserving unrelated NIP-5D/NAP, WebRTC, URL, dependency, and Nostr-kind language.

## Task Commits

1. **Task 1: Align root and package READMEs with shipped contracts** - `147e344b` (docs)

## Files Created/Modified

- `README.md` and `packages/boilerplate/README.md` - Describe init metadata as archetype roles plus conventions.
- `packages/cli/README.md` - Documents `slug:convention` input and convention-only persisted metadata.
- `packages/conformance/README.md` and `packages/conformance-cli/README.md` - Clarify carrier validation without convention payload schemas.
- `packages/core/README.md`, `packages/nap/README.md`, `packages/sdk/README.md`, and `packages/shim/README.md` - Use current opaque convention topics and exact-topic guidance.
- `packages/vite-plugin/README.md` - Links to the living archetype registry and describes exact three-element tag serialization.

## Decisions Made

- Used the pinned archetype registry's `role`, `slug`, and one-convention tag shape; no local multi-convention encoding was selected.
- Marked payload examples as local choices and stated no query, wildcard, prefix, or canonicalization behavior, matching the current exact-string implementation boundary.

## Deviations from Plan

None - plan-owned README edits executed exactly as written.

## Issues Encountered

- `pnpm test:convention-contracts` ran its five scanner fixtures successfully but the live scan remains red on four active `apps/docs/guide/` files owned by later Phase 161 documentation plans and the intentional type-level `IntentContract` removal assertion in `packages/nap/src/intent/shim.test.ts`. These files were not changed. The scoped findings are recorded in `deferred-items.md`.
- `pnpm --filter @napplet/docs build` was run separately after the guard stopped the chained command and passed.

## Known Stubs

None. The only placeholder-like phrase in the scanned README set is the existing optional-domain fallback message in the Vite-plugin example; it is not an unwired or user-facing data stub.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Package README guidance is convention-current. The phase-wide active-surface guard will turn green after the remaining guide migration and its intentional type-negative-test exclusion are resolved by their owning work.

## Self-Check: PASSED

- Confirmed all ten README targets and this summary exist.
- Confirmed Task 1 commit `147e344b` exists and contains no tracked-file deletions.
- Confirmed `git diff --check` passes for the remaining metadata changes.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
