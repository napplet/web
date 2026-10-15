---
quick_id: 260904-nm7
phase: quick-260904-nm7
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-04
---

# Quick Task 260904-nm7 — Validation Strategy

> Per-task validation and production-evidence contract for the packaged-loader UX. NAP-RESOURCE behavior is anchored to PR #80 head `fa6bcc6935aa19e7b70ab2a2c721dafca77c78e1`; in particular, ordered `bytesMany` rows are independent and one failed URL must not discard successful siblings.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Unit/integration framework | Vitest 4.1.2 using `packages/vite-plugin/vitest.config.ts` |
| Retained validator framework | Node built-in `node:test` in `scripts/validate-packaged-loader-evidence.test.mjs` |
| Browser evidence | Installed Playwright/Chromium against the public Paja route with named, closed BrowserContexts |
| Visual gate | `$visual-verdict` exact one-to-one reference/generated comparisons persisted at `.omx/state/packaged-loader-ux/ralph-progress.json` |
| Quick state command | `pnpm --dir packages/vite-plugin exec vitest run --config vitest.config.ts src/optimizer/loader.test.ts` |
| Quick integration command | `pnpm --dir packages/vite-plugin exec vitest run --config vitest.config.ts src/optimizer/pipeline.test.ts src/optimizer/large-fixture-runtime.test.ts` |
| Evidence-validator command | `node --test scripts/validate-packaged-loader-evidence.test.mjs` |
| H1 production-evidence command | `node scripts/validate-packaged-loader-evidence.mjs .planning/quick/260904-nm7-improve-the-napplet-vite-plugin-packaged/evidence --secret-file /tmp/napplet-260904-nm7-evidence.key` |
| H2 publication command | `node scripts/validate-packaged-loader-evidence.mjs .planning/quick/260904-nm7-improve-the-napplet-vite-plugin-packaged/evidence --secret-file /tmp/napplet-260904-nm7-evidence.key --publication --repo napplet/web --head feat/packaged-loader-ux --base feat/vite-plugin-blossom-optimization --review .planning/quick/260904-nm7-improve-the-napplet-vite-plugin-packaged/260904-nm7-REVIEW.md --verification .planning/quick/260904-nm7-improve-the-napplet-vite-plugin-packaged/260904-nm7-VERIFICATION.md` |
| Full suite | `pnpm build && pnpm type-check && pnpm -r test:unit && pnpm lint && pnpm test && pnpm audit --audit-level high` |

## Feedback Sampling And Latency

- Before each production edit, write or select the named RED test first; after each edit, run the smallest matching command below.
- Task 1 state/reducer/runtime feedback target: under 20 seconds.
- Task 2 pipeline/emitted-runtime feedback target: under 30 seconds; the generated 50 MiB+ fixture may take up to 60 seconds and runs after the focused tests.
- Task 3 validator-unit feedback target: under 10 seconds using injected local relay/fetch fixtures.
- Production Paja validation intentionally exceeds 35 seconds because the assertion is a real timestamp-derived active interval; run it once for H1 and once for H2/final publication identity.
- Full repository gates run on H1 and again on metadata-only H2. Any source/evidence change after H1 invalidates the review and restarts H1 gates.

## Per-Task Verification Map

| Task ID | Requirement | Test / Evidence | Automated command | Feedback | Wave 0 | Completion evidence |
|---------|-------------|-----------------|-------------------|----------|--------|---------------------|
| NM7-01-A | LOADER-UX-01, LOADER-UX-02 | Initial/active/partial/success DOM projection, indeterminate progress, verified-only count, no byte fiction | `pnpm --dir packages/vite-plugin exec vitest run --config vitest.config.ts src/optimizer/loader.test.ts` | under 20s | Extend existing test before implementation | RED then GREEN output plus exact DOM assertions |
| NM7-01-B | LOADER-UX-03, LOADER-UX-05 | No absolute timeout, AbortSignal cancellation, pending original promise, native keyboard Retry/Cancel, safe label, contrast/motion markup | same Task 1 command | under 20s | Add fake-time, deferred-promise, unsafe-label, keyboard and CSS cases | Tests remain active past simulated 30s and resolve only through terminal/retry paths |
| NM7-01-C | LOADER-UX-06, NAP-RESOURCE `bytesMany` | Mixed `[success A, failure B, success C]`: cache A/C, preserve B identity, retry only B, return `[A,B,C]` | same Task 1 command | under 20s | Add explicit mixed-row test before runtime edit | Call counts, cache evidence, pending aggregate promise, and ordered final array |
| NM7-01-D | LOADER-UX-01, LOADER-UX-05 | Ten deterministic visual references, each mapped to one required output | PNG signature/IHDR contract command from PLAN Task 1 | under 10s | Capture all ten references before production styling | Ten valid state-specific reference PNGs with non-zero dimensions; no premature comparison claim |
| NM7-02-A | LOADER-UX-01, LOADER-UX-04, LOADER-UX-06 | Head/body injection, immediate markup, byte measurement/hash order, zero-entry/no-op/rollback absence | `pnpm --dir packages/vite-plugin exec vitest run --config vitest.config.ts src/optimizer/pipeline.test.ts` | under 30s | Add injection/absence/order cases before pipeline edit | Exact output ordering and unchanged transaction assertions |
| NM7-02-B | LOADER-UX-02–05, LOADER-UX-07 | Emitted-script initial/active/partial/error/cancel/retry/success, mixed rows, >30s, concurrency, text safety, keyboard, atomic handoff | `pnpm --dir packages/vite-plugin exec vitest run --config vitest.config.ts src/optimizer/large-fixture-runtime.test.ts` | under 30s | Create missing test file before harness/runtime edit | Ordered timestamp/state trace and exact request/cache/result assertions |
| NM7-02-C | LOADER-UX-06 | Existing reference, integrity, bounds, rollback, aggregate and large-fixture regressions | `pnpm --dir packages/vite-plugin exec vitest run --config vitest.config.ts src/optimizer/references.test.ts src/optimizer/large-fixture.test.ts` | <=60s | Existing tests; regenerate evidence only from actual output | Parser-scoped rewrites unchanged and regenerated fixture hashes match |
| NM7-02-D | LOADER-UX-01, LOADER-UX-05 | Ten provisional integrated loader screenshots mapped to the Task 1 references | `local_comparisons` JSON validation command from PLAN Task 2 | visual iteration | Generated targets exist only after Task 2 wiring | Ten local comparison records, each score >=90, pass, category match, full qualitative fields |
| NM7-03-A | RELEASE-01 | Valid retained evidence plus corrupt schema/order/timing/PNG/ZIP/naddr/remote-byte/aggregate/hash/secret/publication fixtures | `node --test scripts/validate-packaged-loader-evidence.test.mjs` | under 10s | Create test before validator | One valid pass and a distinct fail-closed case per validation boundary |
| NM7-03-B | LOADER-UX-01–07, RELEASE-01 | Public Paja screenshots, trace, raw timestamped timeline, public manifest/index/resources | H1 production-evidence command above, without publication/report flags | >35s by design | Validator GREEN before live capture | Validator refetches/recomputes all evidence identities and derives active duration from timestamps without requiring future review files |
| NM7-03-C | RELEASE-01 | H1 complete implementation/evidence gate | targeted tests + validator tests + H1 production-evidence command + full suite + AI-slop/diff gates | full gate | All prior Wave 0 rows GREEN | H1 fixed, normally pushed, live OPEN unmerged PR at H1; no publication-mode validation yet |
| NM7-03-D | RELEASE-01 | Independent code review and local GSD requirement verification of H1 plus live H1 PR | independent reviewer/verifier evidence | independent | H1 immutable | REVIEW passes H1; VERIFICATION records zero failed local requirements and only future H2/publication predicates pending |
| NM7-03-E | RELEASE-01 | Metadata-only H2 | H1..H2 exact-path audit + full/validator/visual gates | full gate | H1 review passed and verifier has no local failures | Only PLAN, RESEARCH, VALIDATION, REVIEW, VERIFICATION, SUMMARY, STATE differ; source/evidence bytes equal H1 |
| NM7-03-F | RELEASE-01 | Final external read-only publication audit | production validator `--publication` plus fresh independent remote/PR audit | final | H2 normally pushed | External verifier closes overall completion: base ancestor, local/remote/PR=H2, OPEN/unmerged, current body, no force event/secret; leader confirms base-push invariant from executed commands |

## Wave 0 Requirements

- [x] Before editing `loader.ts` or adding production loader UI, extend `loader.test.ts` with initial/active/partial/success/failure/cancel/retry/no-timeout/safe-label/keyboard/concurrency and explicit mixed-row successful-sibling retention tests; run and record RED.
- [x] Before editing `pipeline.ts`, add injection, zero-entry/no-op/rollback, byte-measurement and aggregate-order assertions to `pipeline.test.ts`; run and record RED.
- [x] Before editing `large-fixture-runtime.ts`, create `large-fixture-runtime.test.ts` for emitted-script state order, mixed-row retry, >30-second liveness, accessibility projection and atomic handoff; run and record RED.
- [x] Before production styling, create all ten explicit `/tmp/reference-*.png` images and the exact mapping table below. No generated screenshot may be compared to a different state reference.
- [x] Before any live Paja evidence is accepted, create `scripts/validate-packaged-loader-evidence.test.mjs`, observe corruption cases fail, implement the retained validator, and make the complete validator suite GREEN.
- [x] Before the ephemeral deployment, require `/tmp/napplet-260904-nm7-evidence.key` not to exist, create it mode 0600 without output, and keep it available only through the final retained secret scan.

## Production-Evidence Validator Coverage

| Boundary | Validator proof | Corruption test |
|----------|-----------------|-----------------|
| Timeline schema | Exact version and required fields; reject unknown/missing fields | Delete/rename one required field and add one unknown field |
| Event ordering | Monotonic timestamps; navigation -> initial -> request/active -> partial/error/cancel/retry -> ready/final-app -> session close constraints | Reorder each dependent event pair and duplicate a terminal event |
| >35-second liveness | Compute duration from first active/request timestamp to an active sample at least 35,000ms later while a request remains unterminated | Set a summary boolean true but timestamps to 34,999ms; must fail |
| Sessions/states | Exact named closed sessions `packaged-loader-long`, `packaged-loader-retry`, `packaged-loader-cancel`, `packaged-loader-a11y`; all ten required states/screenshots | Omit/rename one session or state, or leave one session open |
| PNGs | Eight-byte PNG magic, valid IHDR, non-zero dimensions matching timeline, full-file SHA-256 matching timeline | Corrupt magic, dimensions, bytes, or recorded hash independently |
| Trace ZIP | ZIP EOCD/central directory valid, no unsafe entry paths, expected Playwright trace entries, full-file SHA-256 matching timeline | Truncate EOCD, mutate entry, path-traverse name, remove trace entry, or alter hash |
| Public naddr | Decode pointer, use relay hints, verify signature/author/kind/d-tag, select exact recorded event | Wrong author/d-tag/signature/event id or unresolved pointer |
| Deployed index | Fetch recorded manifest server/index endpoint, require exact byte length and SHA-256 equal path tag/timeline | Wrong bytes, length, endpoint or path hash |
| Resource bytes | Fetch every recorded resource endpoint, require table association, exact byte length and SHA-256 | Missing endpoint, reordered association, bad bytes/length/hash |
| Aggregate | Recompute NIP-5A sorted `<sha256> <absolute-path>\n` UTF-8 SHA-256 and match manifest aggregate `x` plus timeline | Wrong path/hash/order/newline/aggregate |
| Cross-evidence | Timeline hashes equal actual PNG/trace/index/resources and referenced H1/H2/PR identities | Mutate any recorded/actual side independently |
| Secret absence | With live `--secret-file`, scan evidence, inflated trace text metadata, review/verification/summary/state, H1..H2 diff and PR body against raw/common encodings without printing secret | Seed raw, hex, bech32/base64-derived canaries one at a time |
| Publication | Parse H1 from both reports, require reports attest H1 only; H1..H2 exact seven metadata paths (PLAN, RESEARCH, VALIDATION, REVIEW, VERIFICATION, SUMMARY, STATE); source/evidence tree identity; base ancestry; local/remote/PR H2; OPEN/unmerged; current body; no force-push timeline event | Wrong reviewed SHA, missing/extra H2 metadata file, changed source/evidence, remote/PR mismatch, merged PR or force event |

## Visual And Accessibility Gates

| Reference | Generated | Required state / condition |
|-----------|-----------|----------------------------|
| `/tmp/reference-01-initial.png` | `evidence/01-initial.png` | Immediate styled initial state before resource availability |
| `/tmp/reference-02-active-35s.png` | `evidence/02-active-35s.png` | Indeterminate activity with one resource still active after 35s |
| `/tmp/reference-03-partial.png` | `evidence/03-partial.png` | Verified whole-resource `N of T` partial count |
| `/tmp/reference-04-error.png` | `evidence/04-error.png` | Safe failing-resource label and actionable Retry |
| `/tmp/reference-05-ready.png` | `evidence/05-ready.png` | Ready/application-transition target with atomic handoff |
| `/tmp/reference-06-cancelled.png` | `evidence/06-cancelled.png` | Explicit cancellation and Retry |
| `/tmp/reference-07-light.png` | `evidence/07-light.png` | Light palette/contrast |
| `/tmp/reference-08-dark.png` | `evidence/08-dark.png` | Dark palette/contrast |
| `/tmp/reference-09-reduced-motion.png` | `evidence/09-reduced-motion.png` | Static high-contrast activity under reduced motion |
| `/tmp/reference-10-keyboard-retry.png` | `evidence/10-keyboard-retry.png` | Visible focus and keyboard-operated Retry |

Every row is evaluated separately. Before any next visual edit, persist the current row with `score`, `verdict`, `category_match`, `reasoning`, `differences`, `suggestions`, and `next_actions`. Acceptance requires exactly ten rows, each integer score >=90, `verdict: "pass"`, and `category_match: true`. Unit/browser assertions separately require semantic status/progress, `aria-live`, `aria-atomic`, `aria-busy`, native buttons, 44px targets, visible focus, 4.5:1 text contrast, 3:1 control/focus contrast, reduced-motion CSS, safe `textContent`, and absence of byte/percentage/rate/chunk/ETA copy.

## H1/H2 Publication Audit

1. Finish and commit all source, tests, validator, changeset and retained evidence. Record that implementation/evidence SHA as H1.
2. Run all H1 gates, invoke the retained validator against public production state with the live ephemeral secret file, normal-push only `feat/packaged-loader-ux`, and open the unmerged PR against `feat/vite-plugin-blossom-optimization`.
3. Independent reviewer and GSD verifier inspect H1 plus the live H1 PR. Their files record `reviewed_sha: H1`; REVIEW passes H1, while VERIFICATION records zero failed local requirements and marks only future H2/publication predicates pending. Neither report attests H2.
4. If source/evidence changes, discard the H1 designation and restart from step 1. Do not continue to metadata publication.
5. Commit exactly `260904-nm7-PLAN.md`, `260904-nm7-RESEARCH.md`, `260904-nm7-VALIDATION.md`, `260904-nm7-REVIEW.md`, `260904-nm7-VERIFICATION.md`, `260904-nm7-SUMMARY.md`, and `.planning/STATE.md` as metadata-only H2. Rerun applicable/complete gates and normal-push only the feature branch.
6. A final external read-only reviewer/verifier/publication audit confirms the exact H1..H2 path set, byte-identical source/evidence trees, H1 report provenance, all H2 gates, current base ancestry, local/remote/PR head H2 equality, OPEN/unmerged state, current evidence body, absence of feature force events, and secret absence. The leader separately confirms the base-ref non-push execution invariant from the orchestration tool-call log and the two literal permitted push commands. Capture this externally in the PR body/orchestrator output so no H3 is created.
7. Run the production validator with the H2 PR and `/tmp/napplet-260904-nm7-evidence.key`; only after it passes, delete that explicit key file and the temporary fixture. Do not merge the PR.

The only executable push commands permitted are `git push -u origin feat/packaged-loader-ux` for H1 and `git push origin feat/packaged-loader-ux` for H2. No base-branch refspec, branch deletion, leading `+`, or force option is permitted.

## Manual-Only Verifications

None. The user explicitly authorized one fresh ephemeral production deployment by requiring the real Paja proof. The key is locally generated, never printed/persisted, used through hidden input, scanned before destruction, and removed after the proof; no additional confirmation checkpoint is needed.

## Validation Sign-Off

- [x] Every task has an automated verification command and test/evidence mapping.
- [x] Wave 0 names each new or extended test before production implementation.
- [x] Mixed `bytesMany` success/failure behavior matches NAP-RESOURCE PR #80 head `fa6bcc6` and has explicit retry/order tests.
- [x] Production evidence is accepted only by a retained deterministic validator with positive and corrupt-case tests.
- [x] All ten visual states have exact one-to-one references; local comparisons occur only after Task 2 targets exist and authoritative production comparisons only after Task 3 evidence exists.
- [x] H1 review and pending-aware local verification plus H2 metadata publication avoid self-attestation and prohibit source/evidence edits after H1; the external H2 audit alone closes overall completion.
- [x] Final publication checks exact branch/ref/PR state without any base push or force path.

**Approval:** complete through H1. All Wave 0 tests and references were created before their production surfaces, the fixed H1 passed independent review with zero high/medium findings, and GSD verification records zero failed product requirements. H2 metadata publication and the final external publication audit remain intentionally outside the H1 attestation.
