---
phase: 162
fixed_at: 2026-08-21T19:38:00Z
review_path: .planning/phases/162-blossom-backed-large-asset-optimization/162-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 162: Code Review Fix Report

**Fixed at:** 2026-08-21T19:38:00Z
**Source review:** `.planning/phases/162-blossom-backed-large-asset-optimization/162-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Deployment can publish a manifest whose referenced bytes were never uploaded

**Files modified:** `packages/cli/src/blossom-upload.ts`, `packages/cli/src/deploy-network.ts`, `packages/cli/tests/deploy_network_test.ts`
**Commit:** 42405a1b, 10f246ff
**Applied fix:** Hashes current input bytes before upload and requires complete per-server `(path, digest)` evidence before publication.

### CR-02: The DNS policy is bypassable through DNS rebinding

**Files modified:** `packages/build-tools/src/blossom.ts`, `packages/build-tools/src/network-policy.test.ts`, `packages/vite-plugin/src/optimizer/node-services.ts`
**Commit:** 609c70e2
**Applied fix:** Removed global-fetch fallback and disabled Node’s automatic unpinned optimization transport until a TLS-hostname-preserving pinned transport exists.

### CR-03: Optimized artifacts replace usable URLs with an unhandled custom URI

**Files modified:** `packages/vite-plugin/src/optimizer/pipeline.ts`, `packages/vite-plugin/src/optimizer/references.ts`, `packages/vite-plugin/src/optimizer/large-fixture.ts`
**Commit:** 39295942
**Applied fix:** Limits externalization to rewritten async `fetch(__nappletAssetUrl(...))` callsites, which invoke the existing private resource loader; the 50MiB fixture executes each final rewritten resource call.

### CR-04: Windows build-tool credential writes expose the session secret in the process list

**Files modified:** `packages/build-tools/src/secret-store.ts`, `packages/build-tools/src/secret-store.test.ts`
**Commit:** 66794ead
**Applied fix:** Marks the Windows cmdkey provider unavailable pending an in-memory Credential Manager boundary and verifies no secret reaches process arguments.

### CR-05: Closed stdin can permanently hang Nostr Connect pairing

**Files modified:** `packages/cli/src/nostr-connect.ts`, `packages/cli/tests/nostr_connect_test.ts`, `packages/build-tools/src/terminal.ts`, `packages/build-tools/src/terminal.test.ts`
**Commit:** 03f31ca3
**Applied fix:** Treats EOF as terminal-input failure and adds a bounded closed-stdin pairing regression.

### WR-01: Pairing verifies a syntactically valid signer key but not the claimed remote identity

**Files modified:** `packages/build-tools/src/terminal.ts`, `packages/build-tools/src/terminal.test.ts`, `packages/vite-plugin/src/optimizer/node-services.test.ts`
**Commit:** 03f31ca3
**Applied fix:** Requires the signer public key to equal the session and stored remote identities, closing mismatches.

### WR-02: NIP-65 relay normalization drops valid relay paths

**Files modified:** `packages/build-tools/src/discovery.ts`, `packages/build-tools/src/discovery.test.ts`
**Commit:** 8982d073, 63779b41
**Applied fix:** Preserves non-root WebSocket paths while retaining canonical root relay normalization.

---

_Fixed: 2026-08-21T19:38:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
