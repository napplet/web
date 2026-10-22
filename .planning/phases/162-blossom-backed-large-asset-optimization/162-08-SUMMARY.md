---
phase: 162-blossom-backed-large-asset-optimization
plan: "08"
subsystem: vite-plugin
tags: [vite, node, blossom, nip-46, protected-store, dns, redaction]
dependency_graph:
  requires: [162-05, 162-07]
  provides: [lazy-node-optimizer-services, node-signer-pairing-adapter, node-network-adapters]
  affects: [162-09-live-optimizer-orchestration]
tech_stack:
  added: ["@napplet/build-tools", "qrcode@1.5.4", "@types/qrcode@1.5.6"]
  patterns: [lazy-runtime-capabilities, injected-platform-boundaries, redaction-safe-statuses, deterministic-abort-cleanup]
key_files:
  created:
    - packages/vite-plugin/src/optimizer/node-services.ts
    - packages/vite-plugin/src/optimizer/node-services.test.ts
  modified:
    - packages/vite-plugin/package.json
    - pnpm-lock.yaml
decisions:
  - "Keep Node-only platform capabilities inside the Vite adapter; @napplet/build-tools remains environment-neutral and owns shared signing, discovery, policy, and upload semantics."
  - "Fail visibly with typed redaction-safe statuses when a protected store, interactive pairing, relay discovery, DNS, or HTTP boundary is unavailable."
  - "Create native terminal, process, filesystem, DNS, fetch, and clock adapters only behind service method calls; factory construction is side-effect free."
metrics:
  duration: "13 min"
  completed_date: "2026-08-21"
  tasks_completed: 2
  files_changed: 4
status: complete
---

# Phase 162 Plan 08: Lazy Node Optimization Services Summary

Audited Vite dependencies and a fully fakeable, lazy Node adapter layer now connect later live optimization to the shared protected signing, verified discovery, public-HTTPS policy, and exact-byte Blossom contracts.

## Tasks Completed

1. Added audited Vite consumer dependencies under the lockfile guard.
2. Implemented lazy fakeable Node optimization services with TDD coverage.

## Accomplishments

- Added the workspace `@napplet/build-tools` dependency and approved `qrcode@1.5.4` / `@types/qrcode@1.5.6` dependencies. The lock audit found only the Vite importer and qrcode's required transitive/optional-peer resolution changes.
- Added `createNodeOptimizationServices`, which leaves module import and factory creation pure, and lazily adapts terminal QR/paste input, protected platform storage, process/filesystem, NIP-46 pairing injection, relay discovery injection, DNS, HTTP, clock, and safe logging.
- Reused the shared stable signer-session key, reconnect logic, QR/paste first-success flow, secret persistence, public endpoint policy, and Blossom HTTP contract without adding protocol surface.
- Returned typed, public, redaction-safe unavailable/failure statuses for noninteractive pairing, cancellation, protected-store failures, DNS failures, and HTTP failures; aborts close pending pairing work deterministically.

## Task Commits

1. **Task 1: Add audited Node consumer dependencies under a lockfile guard** — `53f838a8` (`chore`)
2. **Task 2 RED: Add failing Node service regressions** — `7734a34a` (`test`)
3. **Task 2 GREEN: Add lazy Node optimization services** — `3e423d10` (`feat`)

## Verification

- PASS — `pnpm --filter @napplet/vite-plugin install --lockfile-only`
- PASS — `pnpm --filter @napplet/vite-plugin test:unit` — 5 files, 68 tests passed.
- PASS — `pnpm --filter @napplet/vite-plugin type-check`
- PASS — `pnpm --filter @napplet/vite-plugin build`
- PASS — `pnpm --filter @napplet/build-tools test:unit` — 20 tests passed.
- PASS — `pnpm --filter @napplet/build-tools type-check`
- PASS — `pnpm --filter @napplet/build-tools build`
- PASS — `git diff --check`
- PASS — root `package.json` and `deno.lock` stayed byte-identical to their pre-task unowned hashes (`d1c4285a…`, `e15e1543…`) and remained unstaged.

## TDD Gate Compliance

- RED: `7734a34a` — Node service test import failed because the adapter did not exist.
- GREEN: `3e423d10` — focused service tests, package type-check, and build pass.

## Decisions Made

- Preserve `@napplet/build-tools` as the environment-neutral owner of NIP-46 session verification, secret storage semantics, verified discovery, network policy, and Blossom upload behavior.
- Do not create a plaintext Vite config or cache fallback. The Node filesystem adapter is available only at the injected protected-store boundary, where no fallback path is supplied.
- Keep all diagnostics to `SafeStatus`; terminal QR rendering receives a pairing URI only to render its QR matrix and no signer material enters logger, cache, config, or Vite output.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. Empty arrays in the process and test fakes are runtime buffers/test state, not rendered placeholders or disconnected data.

## Threat Flags

None. The Node terminal/store, relay/DNS/HTTP, and dependency/lock trust surfaces are all covered by the plan's T-162-38 through T-162-41 and T-162-SC mitigations.

## Self-Check: PASSED

- All four plan-scoped files exist.
- Commits `53f838a8`, `7734a34a`, and `3e423d10` resolve in git history.
- No tracked file deletions were introduced, and unowned root WIP remains unstaged.
