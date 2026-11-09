---
phase: quick-261104-kdn
plan: 01
subsystem: conformance
tags: [merge, nap-navigation, nap-intent, nap-llm, nip-5d, maturity, docs]
status: complete
requires:
  - phase: 261030-pnj
    provides: PR 280's navigation and intent-delivery implementation at c325cfa9
provides:
  - merge/pr-280 carrying origin/main f28c2fdd through a real two-parent merge commit
  - navigation registered in the maturity catalog and docs groups
  - host ceiling and port revocation applied to navigation and intent endpoints
affects: [PR 280, NAP-NAVIGATION reconciliation, NAP-INTENT reconciliation]
actuals:
  tokens: 45390
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Same-id endpoints keep their first binding in the reference shell"
key-files:
  created: []
  modified:
    - packages/conformance/src/run/boot.ts
    - packages/conformance/src/shell/reference-endpoints.ts
    - packages/conformance/src/shell/reference-handler.ts
    - packages/conformance/src/shell/reference-shell.ts
    - packages/core/src/nap-catalog.ts
    - scripts/lib/nap-maturity-docs.ts
    - apps/docs/naps/intent.md
key-decisions:
  - "Kept the PR's first-binding-wins endpoint registry and gave main's same-id test fixtures distinct ids, rather than changing registry behavior in a merge"
  - "Fixed the merge-made duplicate import in a follow-up commit, because the merge commit was already recorded and history is not rewritten"
metrics:
  duration: 12m
  completed: 2026-11-04
---

# Phase quick-261104-kdn Plan 01: Resolve PR 280 merge conflicts with main Summary

Merged origin/main `f28c2fdd` into `merge/pr-280` with a two-parent commit, fit navigation into main's port binding, maturity catalog and per-domain docs, and applied main's host ceiling and revocation to navigation endpoints. Every gate passes. Nothing was pushed. The PR's superseded draft surface was carried through unchanged and is recorded below.

## Commits

| Commit | Subject |
| --- | --- |
| `5d7d2116` | `chore: merge origin/main into feat/nap-navigation` (parents `c325cfa9`, `f28c2fdd`) |
| `df5e071d` | `fix(conformance): apply host ceiling and revocation to navigation endpoints` |
| `f141df28` | `fix(conformance-cli): merge duplicate conformance type imports` |

`origin/feat/nap-navigation` was still `c325cfa9` and `origin/main` was still `f28c2fdd` after the last fetch. Both are ancestors of HEAD, so a non-force push fast-forwards the PR branch.

## Spec drift

This merge did not reconcile the PR with the current drafts. Reconciling is a separate change.

| Draft | Implemented head | Current head (re-read today) | State |
| --- | --- | --- | --- |
| NAP-NAVIGATION, napplet/naps#126 | `778f0dc1` | `9a4b179ea5fe76e90ae986b2fbf77a3f8b84672d` | open, not draft |
| NAP-INTENT, napplet/naps#128 | `65252428` | `74f9bf85ebb83b50b7b2ad8308a835d5f3113cd9` | open, not draft |

Clauses read from the draft files at those current heads:

- NAP-INTENT line 136: "No intent delivery identifier is exposed."
- NAP-INTENT line 278: "`intent.deliver` is a runtime push and has no request or delivery id."
- NAP-INTENT lines 453-454: "Its `sender` MUST be the target's own catalog identifier. The runtime MUST NOT fabricate, reserve, or null a sender for this purpose."
- NAP-NAVIGATION line 47: "navigation adds no fields to the intent payload or delivery."
- NAP-NAVIGATION changelog line 403 (`d929d45`): "Settled history revisits by matching the next report against the recorded visit instead of delivery ids". The commit subject is "Settle revisits by location instead of delivery ids".

PR surface these contradict, all carried through unchanged:

- `IntentDelivery.id` (required) and nullable `IntentDelivery.sender`, in `packages/core/src/types/intent.ts` and the runtime that assigns them.
- `ReferenceShell.retryIntent(endpointId, deliveryId)` and `failNavigationDelivery(endpointId, deliveryId, definite)`, in `packages/conformance/src/shell/reference-shell.ts`.
- `NavigationReport.deliveryId`, in `packages/core/src/types/navigation.ts`, plus the delivery-id settlement in `packages/conformance/src/shell/navigation-state.ts` and `reference-navigation.ts`. The plan didn't list this field. `deliveryId` appears nowhere in the current NAP-NAVIGATION text.
- Text that describes this surface as following the drafts: `.changeset/intent-navigation-history.md` ("These interfaces follow the published drafts"), `apps/docs/naps/navigation.md`, the navigation sections of the READMEs, `apps/docs/packages/*`, and `skills/*`, and the wording ported to `apps/docs/naps/intent.md`.

Two stale claims need attention:

- The PR body says #128 is closed. It's open. The orchestrator owns the PR body.
- `apps/docs/naps/navigation.md` line 3 repeats it ("even though its PR is closed and unmerged"). The plan says that page stays as is, so it was left alone and belongs in the reconciliation.

The new catalog entry doesn't claim a match: its rationale says the tests cover an earlier published draft revision and later upstream changes aren't reconciled. No `implementationReference` was recorded, and `scripts/data/nap-proposal-observations.json` wasn't seeded.

The merge didn't force any wire-level decision that neither side had already made.

## Conflict resolution

All 36 conflicted paths matched the plan's list, and main hadn't moved past `f28c2fdd`.

**Resolved by choosing one side:**

| Path | Side taken | What was dropped |
| --- | --- | --- |
| `apps/docs/.vitepress/config.ts` | main | The PR's literal sidebar. Navigation reaches the sidebar through `NAP_DOC_GROUPS`. |
| `apps/docs/naps/index.md`, hunk 2 | main | The PR's trailing sections, which main moved to per-domain pages. Hunk 1 is main plus the word `navigation` in the domain union. |
| `packages/conformance/src/run/boot.ts`, hunk 3 | main | The PR's window-listener fragment, so traffic reaches the shell only through `bindNappletPort`. |
| `.planning/STATE.md`, hunk 1 | main | The PR's `last_activity_desc`. |

**Combined, with something from one side dropped:**

- `packages/conformance/src/shell/reference-handler.ts`: PR's navigation branch first, then main's lines. The PR's `!type || !verdict.ok` line is gone so main's correlated LLM `invalid-request` answers still work.
- `packages/conformance/src/run/boot.ts`, hunks 1, 2 and 4: main's prelude requirement and port binding, plus the PR's manifest guard, endpoint and `terminateEndpoint`.
- `packages/conformance/src/shell/reference-shell.ts`: the two `reset` definitions became one that clears records, calls `handler.reset()`, clears deliveries, and calls `navigation.clearPending()`.
- `apps/docs/packages/conformance.md` and `packages/conformance/README.md`: main's required-prelude text plus the PR's `verifiedManifest` sentences. The PR's fallback-fixture paragraph is gone because main deleted that fixture in #286.
- `apps/docs/packages/shim.md` and `packages/shim/README.md`: the PR's "parent" transport wording now names the `napplet.hello` port, per the main-wins transport rule.
- `packages/nap/package.json`, `packages/sdk/package.json`, `jsr.json` files: main's versions, both export blocks.
- `packages/conformance/src/validators/envelope.test.ts`: neither side's numbers. The merged counts are 256 total, 123 outbound, 133 inbound.

**Unions with no loss:** the rest of the manifests, core, SDK and validator sources, `requirements.test.ts`, the remaining docs and skills, and `.planning/STATE.md` hunk 2. In `apps/docs/packages/nap.md`, `apps/docs/packages/sdk.md`, `apps/docs/packages/shim.md` and `skills/napplet-sdk/SKILL.md`, the LLM section comes first, because it's a `###` that would otherwise become a child of the PR's `## Navigation` heading. Elsewhere navigation comes first.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Main's tests assumed per-call endpoint grants**
- **Found during:** Task 1, in the conformance run.
- **Issue:** `validators/llm.test.ts` sent a request under the same endpoint id with narrower `domains` and expected it dropped. The PR's registry keeps the first binding for an id, so the original grant applied and the test failed. The same pattern in `shell/maturity.test.ts` still passed, but no longer tested its no-grant case: the first binding's `['llm']` and the `['storage']` ceiling produced the empty set.
- **Fix:** Gave both fixtures a distinct endpoint id. Registry behavior is unchanged.
- **Worth a look:** a host that calls `handleFrom` with a narrower `domains` for a live id is silently ignored. Hosts that use a fixed endpoint per binding aren't affected, as in `boot.ts` and `attachReferenceShell`. That's worth a reviewer's opinion, and it isn't a wire behavior.
- **Commit:** `5d7d2116`

**2. [Rule 3 - Blocking] Navigation shim tests still stubbed window-level transport**
- **Found during:** Task 2, in `pnpm -r test:unit`.
- **Issue:** `packages/nap/src/navigation/shim.test.ts` and `packages/shim/src/navigation.test.ts` weren't in a conflict hunk and expected `window.parent.postMessage`. Main moved traffic onto the port.
- **Fix:** Moved both to main's `installFakeShell`, following the LLM test's transport-failure pattern. The `'*'` target assertion is gone because a port has no target origin. The shim test now also asserts that a window-level reply from the parent doesn't settle a request.
- **Commit:** `5d7d2116`

**3. [Rule 1 - Bug] Merge produced a duplicate import**
- **Found during:** Task 3, in the aislop scan, which read 96/100.
- **Issue:** Both sides added an `@napplet/conformance` type import to `packages/conformance-cli/src/server.ts`. It auto-merged and type-checked.
- **Fix:** One combined import, as a separate commit so the merge isn't rewritten. Score returned to 98/100.
- **Commit:** `f141df28`

**4. [Rule 2 - Docs sync] One sentence added beyond the plan's file list**
- **Issue:** Task 3 changes `attachReferenceShell` and ceiling behavior, and AGENTS.md requires docs to move with code.
- **Fix:** Added one non-normative sentence to the reference navigation section in `apps/docs/packages/conformance.md` and `packages/conformance/README.md`.
- **Commit:** `df5e071d`

**5. Task 3 commit shape.** The executor default for `tdd="true"` is separate test and implementation commits. The plan names a single `fix(conformance)` commit, so that's what was made. Red was confirmed before implementing: 6 of the 8 new tests failed. The other 2 are guards for behavior that must not change (ceiling includes the domains, `detach()` keeps the endpoint), and they passed before and after.

## Verification

Final gate run from HEAD `f141df28`:

| Gate | Result |
| --- | --- |
| `pnpm build` | exit 0, 13 tasks, **11 from cache**. Executed: `conformance-cli`, `lab-security`. |
| `pnpm type-check` | exit 0, 21 tasks, **19 from cache**. Executed: `conformance-cli:type-check`, `lab-security:type-check`. |
| `pnpm -r test:unit` | exit 0. This goes through pnpm, not turbo, so **nothing is cached**. core 46, web 91, nap 241, cli 266 passed and 3 ignored, vite-plugin 104, shim 20, conformance 327, apps/conformance 9, conformance-cli 39, security-lab 63. |
| `pnpm check:jsr` | exit 0, all exported files exist and are publish-included |
| `pnpm test:nap-maturity` | 7 pass, 0 fail, 0 skipped |
| `pnpm test:skills-contracts` | 11 pass, 0 fail, 0 skipped |
| `pnpm test:conformance` | exit 0, a real Chromium run: 8 passed, 0 failed, 6 skipped, CONFORMANT. The skips are 5 manifest checks (no manifest resolved) and `lifecycle/clean-teardown` (not measured). |
| `vitest run src/browser.test.ts` | 9 of 9 pass. With `-t "round-trips navigation"`: 1 passed, 8 skipped by the filter. |
| `npx -y aislop@0.12.0 scan .` | 98/100, only the `deepmerge` warning. `.aislop/config.yml` unchanged. |
| Conflict markers, unmerged paths | none |
| Ancestry | `c325cfa9` and `origin/main` are both ancestors of HEAD |

The earlier cache misses for the other packages happened in the prior run of the same commands, after `df5e071d` and during Task 2. The final run's cache hits come from those runs of the same source.

Other checks against built output:

- `selectNapDomains({ candidates: ['storage','navigation','intent'] })` returns `["storage","intent"]`. Adding `optIn: ['navigation']` returns all three.
- `NAP_DOMAINS` has `intent, navigation, ble` in order, and `llm` stays last.
- `@napplet/sdk/navigation`, `@napplet/sdk/llm`, `@napplet/nap/navigation` and `@napplet/nap/llm` all import from `dist`.
- The docs build has `naps/navigation.html` with the exploratory label, the grouped index entry, and the ported delivery wording in `naps/intent.html`.

**aislop detail:** the per-engine line prints `Security: 1 error, 1 warning` next to "Suppressed 1 finding(s)", while the total says 0 errors. An export of `origin/main` scanned the same way prints the same lines and the same 98/100, so this isn't from the merge. I didn't determine which finding that per-engine error count refers to.

## Not proven

- `boot.ts`'s `onRevoke` calling `terminateEndpoint` has no direct test. The shell is private to `bootOnce`, so the effect isn't observable from outside. The equivalent wrap in `attachReferenceShell` is tested, and the browser suite still passes with the change.
- `pnpm test:conformance` runs the plain conformant fixture, which doesn't use navigation. The navigation round trip is proven by the separate browser test.
- `pnpm test:unit` (the turbo form) wasn't run. `pnpm -r test:unit`, as the plan specified, was.

## Known Stubs

None.

## Other notes

- `deno.lock` is dirtied by the CLI test suite on every `test:unit` run (5 added lines). It was restored from git each time and isn't in any commit beyond main's own version. `deno.lock` and `pnpm-lock.yaml` in the merge are identical to `origin/main`, and `pnpm install --frozen-lockfile` accepted them.
- The JSDoc on `handleNavigationMessage` still says "Parent-sourced navigation envelope". Main's gamepad shim has the same wording, so it was left alone.
- `scripts/data/nap-proposal-review.md` has no navigation row by design: the scheduled refresh adds the first observation.
- This task's STATE.md row, PLAN.md and this SUMMARY are uncommitted for the orchestrator. `.planning/STATE.md` in the merge has only main's and the PR's existing rows.

## Self-Check: PASSED

Commits `5d7d2116`, `df5e071d` and `f141df28` exist on `merge/pr-280`. All key files exist. No push was made.
