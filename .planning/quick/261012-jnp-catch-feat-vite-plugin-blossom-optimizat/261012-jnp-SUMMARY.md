---
phase: quick-261012-jnp
plan: "01"
subsystem: integration
tags: [git-merge, vite, blossom, nip-5d, cli, ci]
status: incomplete
requirements-completed: []
requires:
  - phase: 162-blossom-backed-large-asset-optimization
    provides: Bounded optimizer and packaged loader
  - phase: 162-nip-5d-event-schema-migration
    provides: Current artifact-hash publishing and metadata
provides:
  - History-preserving integration on existing PR 205
  - Current-schema optimizer and CLI upload regression coverage
affects: [vite-plugin, cli, publishing]
tech-stack:
  added: []
  patterns: [merge-preserved ancestry, verified upload evidence]
key-files:
  created: [.changeset/current-schema-optimizer-integration.md]
  modified: [packages/vite-plugin/src/manifest.ts, packages/vite-plugin/src/requirements.ts, packages/cli/src/deploy-network.ts, packages/cli/src/blossom-upload.ts, .planning/STATE.md, .planning/ROADMAP.md]
key-decisions:
  - Keep the existing branch and PR; merge rather than rewrite history.
  - Preserve both independently numbered phase-162 planning lineages with explicit provenance.
  - Use current NIP-5D artifact hashes and R tags, not historical aggregate/requirement tags.
commits: 19
plan_head_before: f52cc9243cbd734f963f0500f1221ff46ab15aa2
completed: 2026-10-12
---

# Quick Task 261012-jnp: Existing Blossom Branch Integration

**Merged main's current publishing and standalone CLI behavior with the bounded Blossom optimizer, preserving both histories and repairing the evidenced CI digest-wait race. All nine merge-revision GitHub checks pass and PR #205 is CLEAN/MERGEABLE; existing NAP-RESOURCE wire drift blocks a protocol-complete claim.**

## Execution and ancestry

- Started: `2026-10-12T19:12:05Z`.
- Branch: `feat/vite-plugin-blossom-optimization`, explicitly authorized by the user; no new branch or worktree.
- Initial tree: clean except this task's new PLAN; both unstaged and staged diffs were empty.
- Original feature head: `f52cc9243cbd734f963f0500f1221ff46ab15aa2`.
- Fetched main: `10fd4e618ad4ae742105ca52fd79bf9d03ffc6e1`.
- Common base: `1df6dc87e5eee7257af41efb6247d47ec019e3d8`.
- Initial `git rev-list --left-right --count HEAD...origin/main`: **112 feature-only / 17 main-only**.
- Plan commit: `9c49a37d877081f8363abe79c63aba0158ff7ed1` — `docs(quick-261012-jnp): record branch integration plan`.
- Merge commit: `34bd9b909418a675486254f298dda06aa99f2dcf` — `fix(quick-261012-jnp): merge main while preserving Blossom optimization`.
- Merge parents: `9c49a37d877081f8363abe79c63aba0158ff7ed1` and `10fd4e618ad4ae742105ca52fd79bf9d03ffc6e1`.
- Both original feature and fetched main pass `git merge-base --is-ancestor <SHA> HEAD`; no rebase, reset, force push or PR merge occurred.
- The persisted commit ledger measures **19 reachable commits** from the original head to the merge head: 17 imported main commits, the plan commit, and the merge commit. This measurement precedes the final task-artifact commit; it is not a claim of 19 newly authored commits.

Task 1 completed in the plan/evidence commit; Task 2's integration work is committed in the merge commit. Task 3 remains incomplete: closing delivery/check evidence is recorded, but the newly observed living-spec mismatch requires an explicit follow-on scope decision before protocol-complete verification can be claimed.

## Live CI diagnosis

`gh pr view 205 --json number,state,headRefName,headRefOid,baseRefName,mergeable,mergeStateStatus,statusCheckRollup` confirmed open PR [#205](https://github.com/napplet/web/pull/205), base `main`, original head `f52cc924`, `CONFLICTING` / `DIRTY`. Its most recent checks were the September 4 runs; no newer failure superseded them.

`gh run view 33920074189 --json conclusion,headSha,jobs` and `--log-failed` show the failed step was **Run pnpm test**, specifically `@napplet/vite-plugin`'s `large-fixture-runtime.test.ts`. `flushUntil` line 156 failed from line 233 waiting for a verified resource count. Thirty `setImmediate` turns could finish before native WebCrypto digestion on a contended CI runner. The test now waits against a bounded five-second elapsed-time deadline with short real-timer yields, retaining the original digest-gated count and retry/handoff assertions. Production loader behavior was not weakened.

## Exact live conflicts and resolutions

The authority was the unmerged index immediately after `git merge --no-ff --no-commit origin/main`. `git diff --name-only --diff-filter=U` emitted exactly these **20 paths**, and `git ls-files -u` captured all base/ours/theirs entries. No historical plan scopes were used to preselect resolutions.

| Paths | Resolution |
|---|---|
| `.planning/ROADMAP.md`, `.planning/STATE.md` | Retain both phase-162 histories and all quick-task/metric records. Label optimizer and main-schema lineages separately; annotate historical aggregate wording as non-current. Use main's newer position metadata rather than resurrecting the obsolete optimizer protocol model. |
| `README.md` | Keep main's current package/schema/skills descriptions and retain the feature's build-tools row. |
| `apps/docs/packages/vite-plugin.md`, `packages/vite-plugin/README.md` | Keep main's current publishing guide plus optimizer behavior, updating optimizer declarations to `R` and direct artifact hashes. Document resource promotion and preservation of explicit author declarations. |
| `deno.json`, `deno.lock` | Keep build-tools workspace membership, retire main's removed skills package, combine current CLI/parser dependencies and optimizer dependencies. Deno subsequently regenerated the lock from the merged workspace. |
| `pnpm-workspace.yaml`, `pnpm-lock.yaml` | Retain main's API-compatible js-yaml security pins; combine optimizer dependencies with main's parser/tool updates. `pnpm install --lockfile-only` resolved the live lock conflict, followed by successful `pnpm install --frozen-lockfile`. No substitute package was installed. |
| `packages/cli/README.md`, `packages/cli/deno.json` | Preserve safe disabled argv-only macOS/Windows credential writers, main's encrypted portable fallback, and both shared build-tools and standalone CLI dependencies. |
| `packages/cli/src/key-store.ts`, `packages/cli/tests/key_store_test.ts` | Combine shared opaque SecretStore adaptation with encrypted portable fallback and main's explicit-disable diagnostics. |
| `packages/cli/src/blossom-upload.ts` | Verify exactly the retained in-memory icon bytes or disk artifact bytes actually uploaded; retain declared MIME and shared complete-descriptor validation. |
| `packages/cli/src/deploy-network.ts` | Keep main's manifest server hints, origin validation, screenshot/Zapstore publication and additional event IDs; retain the feature's complete-batch verified upload requirements and network-policy injection. Count the actual resolved destinations, not only explicit config. |
| `packages/vite-plugin/package.json` | Union build-tools, parser and optimizer dependencies, keeping main's current package version/tooling. |
| `packages/vite-plugin/src/index.ts`, `packages/vite-plugin/src/types.ts` | Keep main's single-file default and current publishing/intent options alongside automatic optimizer settings and report callback. |
| `packages/vite-plugin/src/index.test.ts` | Replace obsolete aggregate coverage with current schema tests while preserving optimizer coverage and testing explicit resource requirements. |
| `packages/vite-plugin/src/manifest.ts` | Finalize publishing metadata, optimize retained assets, promote committed resource dependencies, then embed final metadata before hashing/signing exact final HTML. Preserve main's artifact guard and external-assets warning plus the reversible optimizer transaction. |

Main's intentional removal of `packages/skills/*`, `apps/docs/packages/skills.md` and the old root skills symlink was preserved; main's new `skills/napplet-*` files replace that distribution. Both pre-merge Git histories and phase artifact directories remain reachable. No unexpected tracked deletion was introduced by a resolution.

## Evidenced non-conflict repairs

Fresh targeted failures were recorded before editing these additional paths:

- `packages/vite-plugin/src/requirements.ts`: preserve explicitly declared `resource` when no optimizer transaction commits; an optimizer no-op cannot erase an author's domain requirement.
- `packages/vite-plugin/src/optimizer/security.test.ts`, `pipeline.test.ts`, `large-fixture.ts`, `large-fixture.test.ts`, `large-fixture.evidence.json`: initial type/tests failed because the merged current schema removes `computeAggregateHash` and `reportedMissingRequires`, requires description content, and uses `R` tags. Update real generated fixture inputs/assertions to current schema; assert final HTML metadata, `R`/`O` resource promotion, and exact final-byte hash. Keep the fixture's seven byte-identical asset digests and independently measure the changed metadata-derived sizes/hash. The 55 MiB fixture has a bounded 30-second test budget rather than an unrealistic five seconds for real parsing/hashing and recovery.
- `packages/vite-plugin/src/optimizer/large-fixture-runtime.test.ts`: original CI evidence authorizes the elapsed-time native digest wait described above.
- `packages/cli/tests/deploy_network_test.ts`, `html_metadata_test.ts`, `zapstore_test.ts`: fresh six-test failure exposed main's origin-only server guard and the feature's stricter DNS/full-descriptor evidence. Use origin-shaped destinations and deterministic public-DNS/full-byte descriptors in existing fakes. Preserve failure assertions; never disable production validation.
- Fresh subsequent failures in `publishing-metadata.test.ts` and Zapstore tests exposed empty asset directories and URL-canonicalization mismatch. In the already-conflicted production files, remove empty directories after a verified commit without allowing best-effort cleanup to trigger data-loss rollback; compare the advertised media destination as a canonical URL.
- `.changeset/current-schema-optimizer-integration.md`: patch release metadata for the changed Vite plugin and CLI shipped behavior. No local publishing was run.
- Deno formatting was restored for the seven edited CLI source/test files; no formatter or scan rule was disabled.
- Task-artifact commit `23be5409` records the summary, additive state and defect ledger. Post-commit review found the SDK `state.add-blocker` also recalculated unrelated phase counters/milestone text and stripped the word `none` from a historical CSP record. A dedicated docs-only correction restores that provenance/counter context, retaining only the new blocker and honest current quick-task activity. No source behavior changes in that correction.
- Final delivery rerun at `87bb6917` exposed a second fixture timing defect: `large-fixture.test.ts`'s whole-Blob fallback exceeded Vitest's default 5,000 ms budget (5,644 ms under recursive unit contention). Its real Vite build parses and retains an over-limit asset; it now uses the same bounded 30,000 ms budget as the companion large-asset test. All assertions remain unchanged; no retry, skip, production change or release bump was introduced. Fresh failure and exact repair path were recorded before editing, and targeted plugin units pass 137/137. Full repaired gates and the subsequent pushed-head checks are reported in the final PR evidence comment after execution.

The independently executed current fixture reports initial HTML **76,897,014 bytes**, final HTML **25,698 bytes**, seven private mappings, exact recovery of every resource, and direct artifact hash `1d957180c709b4a0ff299fb4629eb2d5c32fe7784a842c23f1cb3447b8271d41`.

## Canonical protocol evidence

Protocol resolutions used the actual current `5D.md` at NIP-5D PR #2303 head `020cb8b33a9e4c6b8ca4b2f9d0ed0a67843b68f7`, not its old description/comments or in-repo planning claims. Its **Manifest**, **Identity**, **Required and Optional Capabilities**, and **HTML Metadata for Publishing** sections govern the direct final-artifact `x`, plain-text content, `R`/`O` and metadata-before-hashing decisions. Living source: https://github.com/nostr-protocol/nips/pull/2303.

NAP-RESOURCE PR #80 head `2529209a1a031e1411f84823c6d5fe8c594f78d7`, **API Surface**, **Schemes**, **Identity Scope**, **Wire Protocol / Byte encoding**, and the web resource binding were consulted; source: https://github.com/napplet/naps/pull/80. This exposed an existing implementation mismatch detailed below. Passing fake-Blob fixture tests are not interoperability evidence for the newly revised wire contract. This summary records implementation evidence, not a normative spec copy. No new message, field, loading model, or hard protocol assertion was invented.

## Local verification

All applicable local workflow commands were derived from the merged workflows and package scripts, then build/types/recursive units/full test/e2e/slop were rerun after the final source and formatting edits.

| Command/gate | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass. |
| `pnpm build` | Pass, 13 tasks including all five CLI target builds. |
| `pnpm type-check` | Pass, 19 tasks. |
| `pnpm -r test:unit` | Pass; plugin 137, CLI 194, build-tools 29, core 35, NAP 188, conformance 101, shim 17, conformance web 9, conformance CLI 22. |
| `pnpm test` | Pass, including JSR exports, release-tooling tests, 23 turbo tasks and tutorial conformance. Tutorial reports 5 pass / 0 fail / 6 harness-not-measured skips; these are not represented as measured checks. |
| `pnpm --filter @napplet/conformance-e2e test:e2e` | Pass, 5/5. |
| `pnpm test:workflow-contracts`, `pnpm test:onboarding-contracts`, `pnpm test:convention-contracts` | Pass, 5 tests each plus active convention scan. |
| `pnpm lint` | Exit 0 but **zero configured lint tasks**, not a substantive lint pass. |
| `deno fmt --check` for seven edited CLI source/test files | Pass. |
| Link-check workflow's SPA/docs assembly, installer presence/byte comparisons, `python3 -m http.server 8099`, `node scripts/check-links.mjs http://localhost:8099` | Pass, 24 internal URLs; assembly stored under `/tmp/opencode/jnp/site`. |
| `NAPPLET_TEST_STANDALONE=1 NAPPLET_TEST_BINARY=packages/cli/dist/napplet-linux-x86_64 deno test --node-modules-dir=none -A packages/cli/tests/standalone_integration_test.ts` | Pass, 1/1; real no-host-tools commands with fresh cache. Other platforms are verified remotely, not claimed locally. |
| `NAPPLET_TEST_NPM_RUNNER=1 deno test --node-modules-dir=none -A packages/cli/tests/package_runner_integration_test.ts` | Pass, 1/1; proves pinned public runner wins over an older project-local binary. |
| Actual `sandwichfarm/aislop-badge@v1/scripts/run.sh`, `aislop-version=0.12.0`, unchanged minimum 70 and fail-on-error false | Pass, **96/100**, 0 errors, 3 warnings. No `.aislop/config.yml` exists; none was invented. Report/badge paths alone redirected to `/tmp/opencode/jnp`. |
| `pnpm audit --json` | Exit 1: existing main `fflate` moderate advisory, 0 high/critical. Audit is not a configured required PR gate; finding explicitly deferred, not called green. |
| `git diff --check`, `git diff --cached --check`, empty unmerged index, original/main ancestry | Pass. |

Local environment: Node 26.9.0, pnpm 10.8.0, Deno 2.9.7; Playwright Chromium installed. GitHub CI uses the workflow's Node 22 runtime, so the remote result is separately required.

## Delivery and blockers

The first normal push updated PR #205 to merge commit `34bd9b90`; progress evidence is at https://github.com/napplet/web/pull/205#issuecomment-6131132943. `gh pr checks 205 --watch --interval 15` exited 0 with all **nine** reported checks successful for exactly `34bd9b909418a675486254f298dda06aa99f2dcf`; `gh pr view` confirmed **OPEN / CLEAN / MERGEABLE**, existing branch, base `main`. Final task-artifact delivery follows; its exact SHA and observed check results are recorded in the final PR evidence comment/agent return (a commit cannot embed its own hash). Status remains deliberately **incomplete** because of the protocol scope blocker, not because local or merge-revision CI failed. No PR merge is authorized or attempted.

| Merge-revision remote workflow | Run | Result |
|---|---|---|
| CI (`ci`) | https://github.com/napplet/web/actions/runs/38297671083 | SUCCESS |
| Conformance | https://github.com/napplet/web/actions/runs/38297671041 | SUCCESS |
| AI Slop Score (`Scan`) | https://github.com/napplet/web/actions/runs/38297671017 | SUCCESS |
| Link check | https://github.com/napplet/web/actions/runs/38297671053 | SUCCESS |
| Standalone CLI — Ubuntu x86_64/ARM64, macOS ARM64/x86_64, Windows x86_64 | https://github.com/napplet/web/actions/runs/38297671075 | All 5 SUCCESS |

The active ruleset requires PR delivery and prohibits non-fast-forward updates but specifies no named required status checks or review-count requirement. `gh pr checks 205 --required` reports no required checks. This task nevertheless waits for **all applicable reported checks**, including the five-platform standalone matrix, rather than using that absence to skip CI.

The evidence revision `87bb691797518497bad1691aba6f693a48580e9b` subsequently passed all nine checks as well: CI `38298708017`, conformance `38298707694`, Scan `38298707741`, links `38298707768`, and all five standalone jobs in `38298707798`. The watcher exited 0 and observed OPEN/CLEAN/MERGEABLE with both original-feature and freshly fetched main ancestry intact. Its local recursive-unit rerun independently found the companion fixture timeout described above; that fresh failure was repaired rather than disregarded because remote CI passed. The repaired revision's final checks are recorded in the closing PR comment.

After the companion timeout repair, `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, `pnpm test`, conformance e2e (5/5), unchanged actual AI-slop gate (95/100), and `git diff --check` all completed successfully. Logs are `/tmp/opencode/jnp/repaired-{build,types,units,test,e2e,slop}.log`. Tutorial's six existing harness-not-measured skips remain disclosed. Both canonical proposal heads were refreshed via GitHub API and their actual current source files reread; the SHAs cited above are still current. This test-only timing repair changes no shipped package output.

### Blocking protocol finding — scope decision required

The living NAP-RESOURCE **Wire Protocol** names `urls` for bulk requests, and **Byte encoding** requires canonical base64 text for every wire `blob`. Its **Resource binding / Bytes and local helpers** section requires validating/decoding those wire strings into application-facing Blobs. In contrast, unchanged `packages/nap/src/resource/types.ts:120` defines wire `requests: ResourceBytesRequest[]`, line 166 defines `blob: Blob`, and the shim forwards the old shapes without the required base64 boundary. `git show` confirms this same surface exists at both the original feature head and fetched main; it was not introduced by these merge repairs. The optimizer's existing object-request bulk seam and fake-Blob fixture proof therefore cannot demonstrate interoperability against the current proposal.

AGENTS.md requires flagging downstream/spec mismatches rather than rubber-stamping existing private conventions. No automatic wire/API migration was attempted: that would be a breaking SDK/NAP/conformance change outside the 20 live conflicts and needs an explicit follow-on scope decision. The merge and passing checks remain usable Git integration evidence, **not** a declaration of current NAP-RESOURCE protocol compliance. This blocker keeps `status: incomplete` even if all GitHub checks pass.

## Threat Flags

| Flag | File | Description |
|---|---|---|
| threat_flag: protocol-boundary-drift | `packages/nap/src/resource/types.ts:120,166` | Existing bulk request/Blob wire shapes differ from the living NAP-RESOURCE proposal; passing repository mocks cannot validate interoperability. |

## Deferred issues and deviations

See `deferred-items.md` and additive `.planning/WINDOWS.md` records. Earlier pre-commit scans reported 96/100 and three findings. The final post-commit full scan reports **95/100, zero errors and four warnings**, still passing the exact unchanged minimum-70 gate: existing 89-line `renderDeployReport`, 472-line `references.ts`, `fflate` 0.8.2 GHSA-px8p-9vwx-vf98, plus the integrated `manifest.ts` at 445 lines. The additional integration-size warning is explicitly deferred rather than hidden; no rule was suppressed, and 100/100 is not claimed. No new stubs or skipped tests were introduced; both opt-in CLI integrations were run separately. Nested agent delegation was unavailable (depth limit), so the executor resolved the integration directly.

## Self-Check: PASSED

Both commits above exist, both phase artifact directories and this summary exist, all 20 live conflict paths are resolved, and both original heads are ancestors of the merge commit. All nine remote merge-revision checks pass and PR identity/mergeability were observed. The protocol finding remains explicit; final artifact-revision verification is recorded externally after its push rather than falsely self-referencing this file's future commit hash.
