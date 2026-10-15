---
phase: 162-blossom-backed-large-asset-optimization
verified: 2026-08-21T19:28:55Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 6/7
  gaps_closed:
    - "The public Vite largeAssetOptimization option now reaches the live optimizer and has lazy built-in Node production adapters."
  gaps_remaining: []
  regressions: []
---

# Phase 162: Blossom-backed large-asset optimization Verification Report

**Phase Goal:** Vite builds that would inline more than 2 MiB can safely move eligible large assets to user-discovered Blossom servers and recover them through existing NAP-RESOURCE methods, while preserving a valid inline artifact whenever optimization cannot complete.
**Verified:** 2026-08-21T19:28:55Z
**Status:** passed
**Re-verification:** Yes — after public-path gap closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | A would-be single-file artifact greater than 2 MiB is measured from retained Vite output; eligible assets are selected by descending bytes/path tie-breaker and a non-success leaves a valid inline artifact. | ✓ VERIFIED | `pipeline.test.ts` covers the exact threshold, measurement/order, and rollback; the executed public Vite fixture starts at 76,896,853 bytes, selects seven 6–9 MiB assets in descending order, and finishes at 8,366 bytes. `manifest.ts` restores the baseline inline artifact for every no-op/rollback. |
| 2 | Public Vite configuration can invoke the live optimization path only after the trigger, using production Node adapters by default and caller-owned boundaries only when explicitly configured. | ✓ VERIFIED | The exported `Nip5aLargeAssetOptimizationOptions` exposes `node` and `onReport`; `nip5aManifest()` defaults to `'auto'`; `manifest.ts` passes public `node` options to `createNodeOptimizationServices()` only after an over-target plan. `large-fixture.ts` supplies that public option object to an ordinary `vite.build()` invocation—no private test harness. |
| 3 | Build signing uses least-authority NIP-46, distinguishes the remote transport peer from the user signing identity, supports protected-session reuse or QR/paste pairing, and never exposes secret material. | ✓ VERIFIED | `node-nostr.ts` persists interoperable `nbunksec`, reconnects with the remote key, requests only `get_public_key` and `sign_event:24242`, and returns the signing key obtained through NIP-46. `signer.test.ts`, `terminal.test.ts`, `session-secret.test.ts`, and `node-services.test.ts` exercise identity separation, QR/paste winner/cancellation handling, protected-store failure with ephemeral-only fallback, and redaction. |
| 4 | User Blossom servers are discovered through verified two-stage NIP-65/BUD-03 events and uploads carry exact-byte, verified BUD authorization/evidence over a validated-address-pinned HTTPS transport. | ✓ VERIFIED | `discovery.ts` verifies newest signed kind 10002, uses only write/unmarked relays, then verifies newest kind 10063 server tags. `blossom.ts` hashes and signs exact bytes (kind 24242), validates returned descriptor hash/size, and only permits deletion after complete evidence. `nodePinnedFetch()` supplies a TLS request whose DNS lookup is pinned to the previously validated address. Tests cover forged/stale events, descriptor substitution, partial secondary failure, redirects, and pin preference. |
| 5 | Rewritten artifacts use only canonical `blossom:sha256:<hash>` private mapping plus the proposed NAP-RESOURCE `resource.bytes`/`bytesMany` interface; recovery is bounded and integrity checked. | ✓ VERIFIED | `loader.ts` uses `window.napplet.resource.bytes`/`bytesMany`, verifies Blob length/digest before use, and has no raw-network fallback. The final fixture asserts mapping secrecy outside manifest tags, resource requirement conditioning, corrupt-Blob rejection, and byte-identical recovery. Published proposed [NAP-RESOURCE PR #80](https://github.com/napplet/naps/pull/80) defines the `resource` namespace and `bytes`/`bytesMany`; under AGENTS Rule 1 this is permitted proposed protocol surface, not an invention. |
| 6 | Failures (unavailable signer/discovery/network, unsafe redirect, descriptor/resource substitution, partial upload, unsupported whole Blob, or commit failure) are nonfatal and do not leave a partial/destructive artifact. | ✓ VERIFIED | `pipeline.test.ts`, `security.test.ts`, `blossom.test.ts`, `network-policy.test.ts`, and the whole-Blob fixture cover rollback/no resource tag, safe evidence, partial-upload denial of deletion, redirects, resource mismatch, and a >10 MiB individual Blob remaining inline with no streaming/range claim. |
| 7 | The final executable proof contains more than 50 MiB across modest assets and proves real Vite build, exact upload authorization/evidence, final aggregate hash, and execution/recovery of every selected resource. | ✓ VERIFIED | `large-fixture.test.ts` executed in the 79-test Vite suite: 57,671,680 candidate bytes across seven assets (each ≤10 MiB), initial HTML >2 MiB, final HTML <2 MiB, seven verified kind-24242 uploads, exact final index/aggregate hashes, and execution of emitted final artifact/`bytesMany` recovery. Pinned expected values are in `large-fixture.evidence.json`. |

**Score:** 7/7 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `packages/vite-plugin/src/types.ts` and `src/index.ts` | Public optimizer option and exports | ✓ VERIFIED | `largeAssetOptimization: 'auto' | false | { node?, onReport? }` and Node option types are exported. |
| `packages/vite-plugin/src/manifest.ts` | Trigger-gated public orchestration and fallback | ✓ VERIFIED | Creates production services lazily after selection and restores inline output on unsuccessful outcomes. |
| `packages/vite-plugin/src/optimizer/node-services.ts` and `node-nostr.ts` | Default Node/NIP-46/discovery adapters | ✓ VERIFIED | Lazy default adapters, protected/ephemeral session handling, explicit `ws` transport, abort/dispose paths. |
| `packages/build-tools/src/discovery.ts` and `blossom.ts` | Verified discovery and exact, evidence-gated upload | ✓ VERIFIED | Signature/age filtering, write-only discovery, BUD authorization/descriptors, complete-evidence deletion gate. |
| `packages/vite-plugin/src/optimizer/{loader,large-fixture,large-fixture-runtime}.ts` | Private resource recovery and executable >50 MiB proof | ✓ VERIFIED | Loader is wired into the emitted artifact; fixture runs `vite.build`, reads final output, and executes generated code. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| Public plugin options | `manifest.ts` live optimizer | `largeAssetOptimization.node` passed to `createNodeOptimizationServices()` | ✓ WIRED | Public fixture exercises the exact call path. |
| Node services | NIP-46/Nostr adapter | lazy `node-nostr.ts` imports | ✓ WIRED | Local WebSocket test removes global `WebSocket` and succeeds with direct `ws` configuration. |
| Signing identity | NIP-65/BUD-03 discovery | NIP-46 `get_public_key` result | ✓ WIRED | Dedicated signer test proves user key is not the remote transport key. |
| Verified discovery | Blossom upload | discovered BUD-03 ordered endpoints, `uploadExactBlobs()` | ✓ WIRED | Fixture and build-tools tests show primary/secondary behavior and per-server evidence. |
| Private table | NAP-RESOURCE runtime | emitted loader calls `resource.bytes`/`bytesMany` | ✓ WIRED | Fixture executes emitted output and confirms every selected resource call and exact Blob recovery. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| Optimizer public path | `OptimizationReport` | Actual `vite.build()` close-bundle flow | Measured retained bytes and transaction result | ✓ FLOWING |
| Discovery/upload | user signing pubkey → events → server endpoints → upload evidence | NIP-46 signer and verified Nostr/Blossom boundaries | Production adapters plus locally controlled, cryptographically verified fixture events | ✓ FLOWING |
| Final artifact | private resource entries → `resource.bytesMany` Blobs | emitted loader/application execution | Exact stored byte sequences, verified by SHA-256 and size | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Shared signer/discovery/upload/security behavior | `pnpm --filter @napplet/build-tools test:unit` | 29 passed, 0 failed | ✓ PASS |
| Public Vite path, 50 MiB fixture, Node adapters, loader, rollback | `pnpm --filter @napplet/vite-plugin test:unit` | 79 passed, 0 failed | ✓ PASS |
| Public Vite types | `pnpm --filter @napplet/vite-plugin type-check` | exit 0 | ✓ PASS |
| Secret leak scanner behavior | `node scripts/check-build-secret-leaks.test.mjs` | 5 passed, 0 failed | ✓ PASS |
| Repository whitespace gate | `git diff --check HEAD` | exit 0 | ✓ PASS |
| CI, link, conformance, AI-slop publication checks | `gh pr checks 205` | all four checks SUCCESS | ✓ PASS |

### Requirements Coverage

No requirement IDs are assigned to Phase 162. The roadmap contract and the phase plans supplied the verified truths above.

### Protocol Fidelity

The applicable canonical documents were rechecked: [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md), [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md), [BUD-03](https://github.com/hzrd149/blossom/blob/master/buds/03.md), and [NAP-RESOURCE PR #80](https://github.com/napplet/naps/pull/80). The implementation uses the proposed resource operations and does not create a new NIP-5D envelope, NAP domain/action, raw browser transport, streaming, range, or progress surface.

### Anti-Patterns Found

No `TBD`, `FIXME`, or `XXX` debt markers were found in the reviewed Phase 162 production files. No user-visible stub, orphaned public option, or disconnected fixture path remains.

### Human Verification Required

None. The stateful and ordering claims are exercised by named automated tests: NIP-46 pairing/cancellation and identity tests, rollback tests, the direct Node WebSocket discovery regression, and an actual Vite build whose final emitted artifact is executed.

### Gaps Summary

The prior blocker was closed. The public `largeAssetOptimization` option is exported, passed to the live optimizer, and has default lazy production adapters. The 50 MiB proof now crosses that public Vite configuration boundary. No actionable gaps remain.

---

_Verified: 2026-08-21T19:28:55Z_
_Verifier: the agent (gsd-verifier)_
