# PR 292 inline review fixes

PR: https://github.com/napplet/web/pull/292. Branch: `fix/pr-289-copilot-review`, stacked on `feat/napshot-store-screenshots` (#289). No protocol changes or package release are involved.

## Changes

- `8dd2ffb9`: live discovery and refresh page each relay independently. Live batches remain retryable until every relay finishes successfully. Refresh completion counts only a finished relay history, retaining previously saved trusted labels after partial failures.
- `135821df`: fixture builds use unique temporary workspaces with private sources, output, caches and mirror certificates. Checkout files are never replaced. Concurrent same-checkout and different-checkout tests prove isolation; second-write and startup failure tests prove cleanup.
- `f31055f0`: Link check executes the fixture browser check after all production-site checks. A workflow contract prevents replacing execution with trigger paths alone.
- `d39acea6`: cleanup attempts every partially initialized resource and preserves both the original failure and any cleanup failures.

## Verification

- Regression tests reproduced the shared-cursor loss and incorrect completion before the fixes. Web tests now pass 47 cases, including unequal relay histories, retry after failure and cancellation; refresh tests pass seven cases.
- `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, and `pnpm test` pass. Workflow contracts pass 19 tests, including three fixture-workspace regressions.
- Production site assembly and protocol-route verification pass. Browser checks cover 76 internal links, responsive showcase, production app store and protocol pages.
- `node scripts/check-app-store-napshot.mjs` passes all generated preview, mirror, redirect, eligibility and relay scenarios against isolated build output.
- A real Chromium startup failure, injected with a nonexistent `PLAYWRIGHT_BROWSERS_PATH`, exits with the original error, removes the temporary workspace, and preserves both source JSON files and the production app-store HTML byte for byte.
- Pinned aislop 0.12.0 reports 100/100 with no diagnostics. No rules were disabled.

## Review mapping

Threads `PRRT_kwDOR1n4lc6yY_Bg` and `PRRT_kwDOR1n4lc6yY_CL` are addressed by isolated fixture workspaces and protected startup/cleanup. `PRRT_kwDOR1n4lc6yY_B1` is addressed by the executable CI step. `PRRT_kwDOR1n4lc6yY_B_` and `PRRT_kwDOR1n4lc6yY_CW` are addressed by independent live/refresh pagination and retry/completion regressions.

The main workspace's unrelated Soulseek changes remain untouched. The PR base is preserved; Link check can be dispatched explicitly because its automatic PR trigger targets `main`.
