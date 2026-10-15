---
phase: 162
slug: blossom-backed-large-asset-optimization
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-21
---

# Phase 162 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 for `@napplet/vite-plugin` and `@napplet/build-tools`; Deno test for cross-runtime and existing CLI regressions; Node test for the secret scanner |
| **Config file** | `packages/vite-plugin/vitest.config.ts`; `packages/build-tools/package.json`; `packages/cli/deno.json` |
| **Quick run command** | The targeted `<automated>` command for the active task |
| **Full suite command** | `pnpm -r test:unit` |
| **Estimated runtime** | ~30 seconds quick; ~120 seconds full |

---

## Sampling Rate

- **After every task commit:** Run that task's targeted command below before its atomic commit.
- **After Waves 2–7:** Run the targeted Vite/build-tools suites and touched Deno CLI files for that wave.
- **After Wave 8:** Run the generated fixture, secret scan, complete Deno CLI suite, `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, docs/link/JSR/release checks, and the pinned AI-slop gate.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 30 seconds for the quick suite.

---

## Per-Task Verification Map

Phase 162 has no ROADMAP/REQUIREMENTS IDs, so the spec-less probe fallback was visibly skipped and generated no predicates. The `Requirement` column therefore cites the controlling decision range or canonical-boundary predicate rather than inventing an ID. Every final plan/task ID is listed below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 162-01-01 | 01 | 1 | D-01–D-04, D-14–D-21 | T-162-01–06 | Tracer proves threshold, selection, fake upload/recovery, rollback, conditional resource requirement, private-tag exclusion, and final aggregate hash | unit + tracer | `pnpm --filter @napplet/vite-plugin test:unit -- optimizer/pipeline.test.ts` | ❌ W0 | ⬜ pending |
| 162-02-01 | 02 | 2 | D-08, D-27 | T-162-07 | Package metadata and neutral contracts type-check without root or lock changes | type | `pnpm exec tsc --noEmit -p packages/build-tools/tsconfig.json` | ❌ W0 | ⬜ pending |
| 162-02-02 | 02 | 2 | D-06, D-08, D-27 | T-162-07–10 | Isolated least-authority signer verifies responses, cleans up, redacts, and tests/checks in Deno without lock mutation | Deno unit + check | `deno test --no-lock packages/build-tools/src/signer.test.ts && deno check --no-lock packages/build-tools/src/index.ts` | ❌ W0 | ⬜ pending |
| 162-03-01 | 03 | 3 | D-07 | T-162-11–12 | Protected platform stores preserve valid state and redact all session material | Deno unit | `deno test --no-lock packages/build-tools/src/secret-store.test.ts` | ❌ W0 | ⬜ pending |
| 162-03-02 | 03 | 3 | D-05, D-07, D-27 | T-162-11–13 | QR/paste race is first-success, abortable, protected, and platform-neutral | Deno unit | `deno test --no-lock packages/build-tools/src/terminal.test.ts packages/build-tools/src/secret-store.test.ts` | ❌ W0 | ⬜ pending |
| 162-03-03 | 03 | 3 | D-08, D-27 | T-162-14, T-162-SC | Dirty-safe pnpm/CLI-local Deno integration contains only expected generated hunks | build + diff | `pnpm --filter @napplet/build-tools build && pnpm --filter @napplet/build-tools type-check && deno check --config packages/cli/deno.json packages/build-tools/src/index.ts` | ❌ W0 | ⬜ pending |
| 162-04-01 | 04 | 4 | D-05, D-08 | T-162-15, T-162-17 | CLI pairing delegates to shared services and closes all Deno resources | Deno regression | `deno test --allow-env --allow-read packages/cli/tests/nostr_connect_test.ts` | ⚠️ partial | ⬜ pending |
| 162-04-02 | 04 | 4 | D-06–D-08 | T-162-15–19 | CLI stores/deploy signing preserve behavior and the complete existing suite stays green | Deno regression | `deno test --allow-env --allow-read --allow-write --allow-run packages/cli/tests/key_store_test.ts packages/cli/tests/deploy_signer_test.ts && deno test --allow-all packages/cli/tests` | ⚠️ partial | ⬜ pending |
| 162-05-01 | 05 | 4 | D-09–D-13 | T-162-20–22, T-162-25–26 | Signed newest events, write-relay direction, ordered server list, no-list, SSRF and rebinding are enforced | unit | `pnpm --filter @napplet/build-tools test:unit -- discovery.test.ts network-policy.test.ts` | ❌ W0 | ⬜ pending |
| 162-05-02 | 05 | 4 | D-14, D-15, D-28, D-29 | T-162-23–26 | Exact authorized upload, descriptor binding, direct secondary policy, bounds, and partial failure are enforced | local HTTP | `pnpm --filter @napplet/build-tools test:unit -- blossom.test.ts` | ❌ W0 | ⬜ pending |
| 162-06-01 | 06 | 5 | D-09–D-13 | T-162-27 | CLI suggestions prove corrected shared discovery and explicit no-list behavior | Deno regression | `deno test --allow-env --allow-read --allow-net packages/cli/tests/suggestions_test.ts` | ⚠️ partial | ⬜ pending |
| 162-06-02 | 06 | 5 | D-14, D-28, D-29 | T-162-28–31 | CLI deploy uses shared exact-byte upload, URL policy, and failed-batch semantics | Deno regression | `deno test --allow-all packages/cli/tests/deploy_network_test.ts packages/cli/tests/deploy_plan_test.ts` | ⚠️ partial | ⬜ pending |
| 162-07-01 | 07 | 4 | D-20 | T-162-32, T-162-36–37, T-162-SC | Parser-backed support matrix preserves unsupported forms and generated lock hunks exclude unrelated dirty state | unit + diff | `pnpm --filter @napplet/vite-plugin test:unit -- optimizer/references.test.ts && git diff --check -- packages/vite-plugin/package.json pnpm-lock.yaml` | ❌ W0 | ⬜ pending |
| 162-07-02 | 07 | 4 | D-19–D-21, D-29 | T-162-33–35 | Loader uses only whole-Blob resource methods, checks association/hash/size, and bounds memory/URLs | browser unit | `pnpm --filter @napplet/vite-plugin test:unit -- optimizer/loader.test.ts` | ❌ W0 | ⬜ pending |
| 162-07-03 | 07 | 4 | D-02–D-04, D-20 | T-162-32, T-162-37 | Selection requires complete support and committedResourceCount is positive only after commit | unit | `pnpm --filter @napplet/vite-plugin test:unit -- optimizer/pipeline.test.ts optimizer/references.test.ts optimizer/loader.test.ts` | ❌ W0 | ⬜ pending |
| 162-08-01 | 08 | 5 | D-27 | T-162-SC | Audited Vite dependency and lock changes exclude known unrelated dirty root hunks | package + diff | `pnpm --filter @napplet/vite-plugin install --lockfile-only && git diff --check -- packages/vite-plugin/package.json pnpm-lock.yaml` | ❌ W0 | ⬜ pending |
| 162-08-02 | 08 | 5 | D-05, D-07, D-09–D-15, D-29 | T-162-38–41 | Node services are lazy, fakeable, abortable, protected-store backed, and secret-safe | unit | `pnpm --filter @napplet/vite-plugin test:unit -- optimizer/node-services.test.ts && pnpm --filter @napplet/vite-plugin type-check` | ❌ W0 | ⬜ pending |
| 162-09-01 | 09 | 6 | D-01–D-15, D-26 | T-162-42–48 | Automatic live flow is lazy and every non-success preserves inline output with zero committed resources | integration | `pnpm --filter @napplet/vite-plugin test:unit -- optimizer/pipeline.test.ts optimizer/node-services.test.ts` | ❌ W0 | ⬜ pending |
| 162-09-02 | 09 | 6 | D-16–D-21 | T-162-42–48 | Resource tag is exact/conditional, private mapping stays outside tags, rollback restores inline output, and aggregate hash is final | integration + security | `pnpm --filter @napplet/vite-plugin test:unit -- index.test.ts optimizer/security.test.ts optimizer/pipeline.test.ts` | ❌ W0 | ⬜ pending |
| 162-10-01 | 10 | 7 | D-22–D-24 | T-162-49–51 | Generated 50 MiB+ bounded assets prove signed discovery/upload, conditional requirement, final hash, and exact recovery | generated integration | `pnpm --filter @napplet/vite-plugin test:unit -- optimizer/large-fixture.test.ts` | ❌ W0 | ⬜ pending |
| 162-10-02 | 10 | 7 | D-24 | T-162-52 | Package/app docs match canonical boundaries, and Spike 001 preserves valid measurements while rejecting its read-relay fixture as canonical evidence | docs + build | `rg -q "Non-normative discovery erratum" .planning/spikes/001-blossom-build-optimization/README.md && rg -q "not canonical protocol evidence" .planning/spikes/001-blossom-build-optimization/README.md && rg -q "write/unmarked" .planning/spikes/001-blossom-build-optimization/README.md && pnpm check:links && pnpm --filter @napplet/vite-plugin build && pnpm --filter @napplet/build-tools build` | ❌ W0 | ⬜ pending |
| 162-10-03 | 10 | 7 | D-24 | T-162-52 | Root overview exposes build-tools and contains no stale read-relay guidance | docs + links | `rg -q "@napplet/build-tools" README.md && pnpm check:links` | ❌ W0 | ⬜ pending |
| 162-11-01 | 11 | 8 | D-07, D-25 | T-162-53, T-162-56 | Focused scanner detects real secret encodings without echoing matches or flagging safe identifiers | Node unit + scan | `node --test scripts/check-build-secret-leaks.test.mjs && node scripts/check-build-secret-leaks.mjs` | ❌ W0 | ⬜ pending |
| 162-11-02 | 11 | 8 | D-23–D-25 | T-162-53–56, T-162-SC | Evidence, changesets, full gates, staged diff, push, and PR occur only after durable green input | full gate | `node --test scripts/check-build-secret-leaks.test.mjs && node scripts/check-build-secret-leaks.mjs && deno test --allow-all packages/cli/tests && pnpm build && pnpm type-check && pnpm -r test:unit && pnpm check:links && pnpm check:jsr && pnpm test:release-tooling && npx --yes aislop@0.12.0 scan --changes --base origin/main && git diff --check` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Before production logic in 162-01-01: create `packages/vite-plugin/src/optimizer/pipeline.test.ts` for boundary, selection, upload seam, rollback, and recovery.
- [ ] Before production logic in 162-02-02: create `packages/build-tools/src/signer.test.ts`; before 162-03-01/02 create `secret-store.test.ts` and `terminal.test.ts`.
- [ ] Before production logic in 162-05-01/02: create `discovery.test.ts`, `network-policy.test.ts`, and `blossom.test.ts` with forged/stale, SSRF/rebinding, descriptor, and partial-batch vectors.
- [ ] Before production logic in 162-07-01/02: create `references.test.ts` and `loader.test.ts` for every supported/ineligible form and whole-Blob boundary.
- [ ] Before Node/live wiring in 162-08-02 and 162-09-01/02: create `node-services.test.ts` and `security.test.ts`, including conditional `['requires','resource']`, callback behavior, rollback, final hash, and every high-severity threat.
- [ ] Before phase demonstration sign-off in 162-10-01: create the deterministic generated 50 MiB+ local relay/Blossom plus fake NAP-RESOURCE fixture using multiple individually bounded blobs.
- [ ] Before outward actions in 162-11-01/02: create the secret scanner/tests covering final HTML, manifest, temporary build files, reports, config/cache-facing artifacts, staged diff, PR body, and captured logs.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Terminal QR legibility and real remote-signer pairing | D-05–D-07 | Automated tests can validate URI, QR renderer calls, paste fallback, reconnect, and redaction, but cannot guarantee a particular terminal or third-party signer UI | Run the optimized generated example without a stored signer, scan the displayed `nostrconnect://` QR with a NIP-46 signer, authorize only `get_public_key` and kind `24242` signing, rebuild, and confirm stored reconnect avoids a second pairing prompt |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify and named test-first dependencies where production behavior is added.
- [x] Sampling continuity: every task has an automated verify command.
- [x] Wave 0 identifies every missing test artifact before dependent implementation.
- [x] No watch-mode flags.
- [x] Targeted feedback latency is planned below 30 seconds except the intentionally generated large fixture and final full gates.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** planned; `wave_0_complete` remains false until the named tests are created and observed red during execution.
