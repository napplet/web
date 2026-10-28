---
status: resolved
trigger: "ci is failing in https://github.com/napplet/web/pull/265"
created: 2026-10-26
updated: 2026-10-26
---

# PR #265 CI dry-run failure

## Symptoms

- Expected: the full CI test suite passes; `deploy --dry-run --json` reports its plan without downloading browser tooling.
- Actual: the `packages/cli/tests/html_metadata_test.ts` dry-run case exits 1 in CI.
- Error: `Downloading private CLI runtime (Node 22.23.3)... Requires net access to "nodejs.org:443", run again with the --allow-net flag`.
- Timeline: first seen on PR #265 commit `357d8cd1`; newer run on `28cb8a47` was still in progress when investigation began.
- Reproduction: run the named Deno test with its normal unit-test permissions and an empty private runtime cache.

## Current Focus

- hypothesis: the dry-run test invokes the real screenshot runner without network permission on cold CI runners.
- next_action: push the test fix and confirm the new CI workflow passes.

## Evidence

- 2026-10-26: GitHub Actions CI run 40325675988 failed 238 passed / 1 failed / 3 ignored; the failing test's post-test output shows a blocked Node runtime download.
- 2026-10-26: Run 40327975950 failed the same named test with the same blocked download. The CLI README and screenshot tests establish that dry runs intentionally capture a preview.
- 2026-10-26: The focused test passes under its no-network Deno permissions after injecting a screenshot runner; `pnpm test`, `pnpm build`, `pnpm type-check`, and the pinned AI-slop scan (100/100) also pass locally.

## Resolution

- root_cause: this metadata test called `main()` without its optional `runScreenshot` test runner. A cold CI runner therefore attempted to provision the private Node runtime for the intentional dry-run preview, but the unit test grants no network permission.
- fix: inject a runner that writes a known PNG, and assert that the selected artifact is captured exactly once. Production dry-run behavior is unchanged.
- verification: focused no-network test, full `pnpm test`, `pnpm build`, `pnpm type-check`, and `aislop@0.12.0 scan --json .` all pass locally. Live CI confirmation follows the pushed commit.
