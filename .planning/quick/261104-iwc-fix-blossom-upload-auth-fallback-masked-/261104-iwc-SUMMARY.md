---
phase: 261104-iwc-fix-blossom-upload-auth-fallback-masked-
plan: 01
status: complete
subsystem: cli
tags: [blossom, bud-11, deploy, auth, retry, cdn]

requires: []
provides:
  - "napplet deploy moves to the next Blossom auth token on HTTP 502, 503 and 504"
  - "The retry decision reads the status from the fixed PUT prefix, so response bodies cannot change it"
  - "Regression tests for the fallback, its limits and token carryover"
  - "Patch changeset for @napplet/cli"
affects: [napplet-deploy, blossom-upload]

actuals:
  tokens: 2378 # chars/4 over the realized diff, c9b5609c..57a61d6e (8623 over the whole changed files)
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Parse HTTP status from the fixed failure prefix, never from server-controlled text"

key-files:
  created:
    - .changeset/blossom-gateway-auth-fallback.md
  modified:
    - packages/cli/src/blossom-upload.ts
    - packages/cli/tests/deploy_network_test.ts

key-decisions:
  - "Only 502, 503 and 504 retry without auth-shaped text; every other 5xx still makes one PUT"
  - "The first token keeps server=<lowercase host>, because BUD-11 specifies it and the rejecting server is at fault"
  - "Ran the strict autonomous tracer gate instead of returning a human-verify checkpoint (see Deviations)"

patterns-established:
  - "Retry decisions anchor on the prefix putFileToServer writes, ahead of x-reason and body text"

requirements-completed: [GH-269]

coverage:
  - id: D1
    description: "A gateway status moves to the next auth token and reaches the unscoped token"
    requirement: GH-269
    verification:
      - kind: unit
        ref: "packages/cli/tests/deploy_network_test.ts#executeNetworkDeploy retries without server scope when a gateway masks the auth failure"
        status: pass
    human_judgment: false
  - id: D2
    description: "A persistent 502, 503 or 504 makes exactly 3 PUTs in attempt order, reports that status and publishes nothing"
    requirement: GH-269
    verification:
      - kind: unit
        ref: "packages/cli/tests/deploy_network_test.ts#executeNetworkDeploy tries every auth attempt on a persistent gateway ${status}"
        status: pass
    human_judgment: false
  - id: D3
    description: "Other 5xx statuses make 1 PUT, whatever their body says"
    requirement: GH-269
    verification:
      - kind: unit
        ref: "packages/cli/tests/deploy_network_test.ts#executeNetworkDeploy does not retry other 5xx responses, whatever their body says"
        status: pass
    human_judgment: false
  - id: D4
    description: "Later files start with the token that got past the gateway"
    requirement: GH-269
    verification:
      - kind: unit
        ref: "packages/cli/tests/deploy_network_test.ts#executeNetworkDeploy sends later files straight to the token that got past the gateway"
        status: pass
    human_judgment: false
  - id: D5
    description: "The real 640 KB upload succeeds against a live Blossom server behind a CDN"
    requirement: GH-269
    verification: []
    human_judgment: true
    rationale: "Not run here. The executor was told not to call a real Blossom server, so the live check belongs to the orchestrator."

duration: 4min
completed: 2026-11-04
---

# Phase 261104-iwc Plan 01: Blossom Gateway Auth Fallback Summary

`napplet deploy` now tries the next Blossom auth token after HTTP 502, 503 or 504, so a CDN that hides an early auth rejection no longer stops a large upload from reaching the unscoped token.

## Performance

- **Started:** 2026-11-04T12:41:48Z
- **Completed:** 2026-11-04T12:45:00Z, before this summary was written
- **Tasks:** 3 of 3
- **Files changed:** 3

## Accomplishments

- Renamed `isRetryableAuthFailure` to `shouldTryNextAuthAttempt` and made it read the status from the fixed `PUT <url> returned HTTP <status>` prefix.
- 502, 503 and 504 now continue whatever the body says. 400 and 401 still need the existing auth-shaped text. Every other result stops, including blob descriptor failures.
- A 500 whose body mentions `HTTP 401: invalid authorization` no longer retries. The old check matched that text anywhere in the error.
- Added 6 tests to `deploy_network_test.ts`, taking the file from 12 to 18. The persistent gateway case registers one test per status.
- Added the `@napplet/cli` patch changeset. No docs changed, because searching `packages/cli/README.md`, `apps/docs` and `skills` for `isRetry`, `auth-shaped` and `unscoped` found nothing.

## Task Commits

1. **Task 1: Carry one deploy past a gateway 502 to the unscoped token** - `26e2e391` (fix)
2. **Task 2: Pin the limits of the fallback and the token carryover** - `02706b56` (test)
3. **Task 3: Add the changeset and run the CLI gates** - `57a61d6e` (chore)

## Verification

| Command | Result |
|---------|--------|
| `deno test ... tests/deploy_network_test.ts`, RED before the source change | Failed as intended: 12 passed, 1 failed, with the new test getting `success: false` after the 502 |
| `deno test ... tests/deploy_network_test.ts`, final | Exit 0, 18 passed, 0 failed |
| Task 1 and Task 3 greps, including the 4-line changeset check | Passed |
| `deno task check` in `packages/cli` | Exit 0 |
| `pnpm build` | Exit 0, 13 of 13 tasks, 12 from cache |
| `pnpm type-check` | Exit 0, 21 of 21 tasks, 20 from cache |
| `pnpm -r test:unit` | Exit 0. CLI: 266 passed, 0 failed, 3 ignored |
| `npx -y aislop@0.12.0 scan .` | Exit 0, 98/100, 0 errors, with the known `deepmerge` advisory as the only warning |

Mutation checks, each run against the new tests and restored from `git checkout -- packages/cli/src/blossom-upload.ts` afterwards:

| Temporary source change | Result |
|-------------------------|--------|
| Pre-fix predicate from `HEAD~1` | 6 tests failed: the Task 1 test, all 3 gateway tests, the other-5xx test and the carryover test |
| Status read from anywhere in the error text | Only the other-5xx test failed (`Expected 1, got 3`) |
| Preferred attempt never carried over | Only the carryover test failed (4 PUTs instead of 3) |
| 505 treated as a gateway status | Only the other-5xx test failed (`Expected 1, got 3`) |

### Not run or not proven

- **No live upload.** Nothing here called a real Blossom server, so the 640 KB case is proven only through fake-fetch tests. The orchestrator owns the live check.
- **3 ignored CLI tests.** They are `npm selects the compatible runner despite an older project-local binary`, `standalone commands provision and reuse tooling with no host runtimes or package managers`, and `standalone config migration refuses unattended consent and continues after explicit approval`. None are in the files this plan changed.
- **Cached gates.** The turbo cache served most of `pnpm build` and `pnpm type-check`; only the `@napplet/cli` tasks ran again.
- **aislop output.** The Security line printed `1 error, 1 warning`, while its totals say 0 errors and the JSON output lists only the `deepmerge` warning. It also reported 1 finding suppressed by an `aislop-ignore` directive, which is probably that error, but I did not confirm it. Neither changed source file contains such a directive.

## Deviations from Plan

### Execution choices

**1. Tracer gate ran in its autonomous form**
- **Found during:** Task 1
- **Issue:** `workflow.auto_advance` and `workflow._auto_chain_active` are both false, and the executor's default for that case is a human-verify checkpoint right after the tracer commit. The plan is `autonomous: true`, and the dispatch said to execute all tasks.
- **Choice:** Re-ran the tracer's full verify after commit `26e2e391` (exit 0, greps passed), then continued. No human reviewed the slice before expansion.

**2. Task 1 is one commit, not separate RED and GREEN commits**
- The plan names a single `fix(cli)` commit for the test and source, so RED was shown by a failing run rather than by a `test(...)` commit. The plan's type is `execute`, so the plan-level TDD gate does not apply.

### Auto-fixed Issues

None. The plan's production and test changes applied as written.

## Issues Encountered

- My first mutation run was invalid: zsh did not word-split the test command held in a variable, so all four runs exited 127 without running a test. I reran it through a shell function, and the results above come from that rerun.

## Deferred Issues

Pre-existing, and left alone because the plan says to keep this regular expression unchanged: the auth-shaped check for 400 and 401 still tests the full error text, which includes the upload URL. A server host containing `auth` or `token` makes every 400 or 401 from it look auth-shaped, so a plain 400 there would try the other tokens. This only causes extra attempts, not a false success.

## Threat Register

- **T-261104-iwc-01 (mitigate):** done. The status comes from the anchored prefix, and the other-5xx test with mutation B proves body text cannot change the decision.
- **T-261104-iwc-02 and -03 (accept):** unchanged. A gateway can now cause the unscoped token to be sent, and a persistent outage costs up to 3 full-body PUTs per file per server.

No security surface beyond the threat model was added.

## Known Stubs

None.

## State Updates

`STATE.md`, `ROADMAP.md` and `REQUIREMENTS.md` were not changed. `state.advance-plan` and the related commands would move the tracked position of phase 164, which this quick task does not belong to, so these records are left to the orchestrator along with the docs commit.

## Next Phase Readiness

The branch is ready for the orchestrator's live check, push and PR. Apart from this summary, the working tree has only the paths the executor was told to leave alone: `deno.lock`, `.codebase-memory/`, `.planning/research/.cache/`, `packages/cli/dist-bin/` and `workshop/`.

## Self-Check: PASSED

- All 3 changed files and this summary exist.
- Commits `26e2e391`, `02706b56` and `57a61d6e` exist on the branch, each with the `Co-Authored-By` trailer.
- The commits touch only `.changeset/blossom-gateway-auth-fallback.md`, `packages/cli/src/blossom-upload.ts` and `packages/cli/tests/deploy_network_test.ts`, and delete no files.

## Orchestrator live check (2026-11-04)

The open live check above was run after execution and passed. On fresh ~640 KB fixtures against `https://blssm.us`, two runs from source and one run of a compiled `--engine quickjs` darwin/arm64 binary all exited 0, with `failedUploads: 0`, and the hash URL returned the matching SHA-256. The same repro on the unfixed 0.14.0 binary exited 1 with HTTP 502. Probe blobs were deleted afterward.
