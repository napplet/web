---
phase: 162-blossom-backed-large-asset-optimization
plan: "05"
subsystem: build-tools
tags: [blossom, nip-65, nip-b7, bud-01, bud-02, bud-03, bud-11, ssrf]
dependency_graph:
  requires: [162-03]
  provides: [verified-blossom-discovery, exact-byte-direct-upload]
  affects: [vite-plugin, cli, asset-optimization]
tech_stack:
  added: []
  patterns: [verified-two-stage-discovery, injected-dns-policy, bounded-direct-upload, turbo-discovered-deno-tests]
key_files:
  created:
    - packages/build-tools/src/discovery.ts
    - packages/build-tools/src/network-policy.ts
    - packages/build-tools/src/blossom.ts
    - packages/build-tools/src/discovery.test.ts
    - packages/build-tools/src/network-policy.test.ts
    - packages/build-tools/src/blossom.test.ts
  modified:
    - packages/build-tools/package.json
    - packages/build-tools/src/index.ts
decisions:
  - "Discover kind-10063 only through the newest verified kind-10002 event's write or unmarked relay URLs; never use the relay URLs as Blossom servers."
  - "Treat public-HTTPS/DNS checks as non-normative build-tool hardening and revalidate every manually followed redirect."
  - "Use direct primary-first uploads only; do not call BUD-04 remote mirroring from the build process."
requirements-completed: []
coverage:
  - id: D1
    description: "Verified NIP-65 to BUD-03 two-stage server discovery with deliberate no-list outcomes"
    verification:
      - kind: unit
        ref: "packages/build-tools/src/discovery.test.ts"
        status: pass
      - kind: unit
        ref: "packages/build-tools/src/network-policy.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Exact-byte BUD-01/BUD-02 upload with scoped BUD-11 authorization and non-committable partial failures"
    verification:
      - kind: unit
        ref: "packages/build-tools/src/blossom.test.ts"
        status: pass
    human_judgment: false
metrics:
  tasks_completed: 2
  files_modified: 8
  completed_date: 2026-08-21
status: complete
---

# Phase 162 Plan 05: Verified Blossom Discovery and Upload Summary

`@napplet/build-tools` now discovers an author's ordered Blossom servers through verified NIP-65 write relays and uploads retained exact bytes through bounded, descriptor-verified BUD operations.

## Performance

- **Duration:** 33 min
- **Started:** 2026-08-21T15:56:36Z
- **Completed:** 2026-08-21T16:29:03Z
- **Tasks:** 2/2
- **Files modified:** 8

## Accomplishments

- Added signature-verified, deterministic kind-10002 then kind-10063 discovery, using only write/unmarked author relays and returning a visible no-server-list outcome when no safe server list exists.
- Added an injected, non-normative public-HTTPS policy that rejects unsafe URL forms, private/reserved/mixed DNS answers, and redirect rebinding.
- Added exact-byte BUD-01/BUD-02 direct upload with signed and locally verified BUD-11 authorization, bounded descriptor parsing, primary-first evidence, and failed batches that never authorize deletion.

## Task Commits

1. **Task 1: Discover ordered Blossom servers through verified write relays** — `f8f43b4f` (RED tests), `59436443` (implementation).
2. **Task 2: Upload exact blobs with short-lived authorization and descriptor verification** — `ce7ccf97` (RED tests), `b5dce2c0` (implementation).
3. **Test-discovery correction** — `4ac55347` (plan correction), `a2a1e834` (package test script), `63541801` (portable test discovery).

## Verification

- `pnpm --filter @napplet/build-tools test:unit` — 20 passed across all six build-tools source test files.
- `pnpm test:unit` — Turbo discovered and ran `@napplet/build-tools#test:unit`; all 25 workspace tasks passed.
- `pnpm --filter @napplet/build-tools type-check` — passed.
- `pnpm --filter @napplet/build-tools build` — passed.
- `git diff --check` — passed.

## Decisions Made

- Use canonical NIP-65 direction: query directory relays for the newest verified author kind-10002, then query only that event's write/unmarked relays for the newest verified author kind-10063.
- Preserve BUD-03's first-occurrence server order after normalization and deduplication; do not invent a default upload server when discovery has no valid list.
- Scope every BUD-11 upload token to the exact lowercase SHA-256 and lowercase server hostname, and retry a 401 only with a newly signed, human-readable authorization event.
- Use a package-local lock-free Deno `test:unit` script so Turbo always discovers every build-tools regression vector.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - Bug] Remove cached verifier state before accepting discovery events**
- **Found during:** Task 1 forged-event vector.
- **Issue:** A shallow-copied signed event can carry library-local verification cache state even after an attacker-visible field changes, invalidating a forged-event test if verification receives that object directly.
- **Fix:** Reconstruct the complete signed-event data before verifying and before retaining discovery evidence.
- **Files modified:** `packages/build-tools/src/discovery.ts`.
- **Verification:** The forged kind-10002 event is rejected while the valid newest event selects the second-stage relay set.
- **Committed in:** `59436443`.

**Total deviations:** 1 auto-fixed (Rule 1).

## Issues Encountered

- The original plan named a package test command that did not exist and appended filenames to it. The approved correction added the deterministic package script, changed all plan verification to the full suite, and proved Turbo discovery.
- `state.update-progress` reported that its legacy progress field was unavailable after the plan counter advanced. `STATE.md` session/metric updates and the Phase 162 ROADMAP plan count were written successfully.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The Vite-plugin optimizer can consume `discoverBlossomServers`, `createNetworkPolicy`, and `uploadExactBlobs` through Node-specific adapters while keeping relay, DNS, fetch, and signer capabilities injected.
- Discovery and upload errors are redaction-safe typed outcomes/evidence; no artifact deletion is authorized on partial, malformed, redirected-to-private, or cancelled uploads.
- All build-tools source tests now run through the package and root Turbo test commands without creating or updating a Deno lockfile.

## Self-Check: PASSED

- All six new source/test files, the package test script, and the updated public barrel exist.
- All eight 162-05 task/correction commits resolve in repository history.
