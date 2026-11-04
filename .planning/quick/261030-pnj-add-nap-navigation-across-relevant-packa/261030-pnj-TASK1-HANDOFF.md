---
status: incomplete
task: 1
commits: 0
plan_head_before: f6839146
---

# Navigation binding handoff

Task 1 implementation and focused validation are complete. The full plan remains incomplete until runtime history, documentation, final verification, and the PR are complete. Changes remain unstaged for the parent to commit: this executor's role permits worktree commits only on agent-prefixed branches, while the authorized shared worktree uses `feat/nap-navigation`.

## Implemented

- Core navigation value, report, view, result, and injected API types; domain registry and type exports.
- Four NAP envelopes and report/get transport with operation-plus-id correlation, structured rejection results, timeout, teardown, and failed-post cleanup.
- Application helpers and ergonomic `report`/`get` aliases on NAP and SDK navigation subpaths; root SDK namespace, named helpers, and `NAVIGATION_DOMAIN`.
- Runtime routing and explicit navigation-plus-intent injection. No dependency is automatically granted, and no browser History API is intercepted.
- npm/JSR exports and tsup entries; Vite static subpath/window requirement inference.

## Verification

Before implementation, the new inference test produced four expected assertion failures because navigation was absent from the known-domain list. The new transport test also failed while the domain module was absent.

All core, nap, shim, and SDK builds passed. Full relevant suites passed with core 35, nap 202, shim 13, SDK 2, and Vite 99 tests. After the final result guard adjustment, the four builds and navigation transport 5, injection 2, and built SDK 2 tests passed again. Final nap, shim, SDK, and Vite type-checks passed; JSR export checks and `git diff --check` passed.

The parallel INTENT change subsequently made the existing core intent-contract fixture require a delivery ID. That one core type-check failure was handed to the Task 2 owner, who owns the INTENT update. Core type-check had passed before that parallel change.

## Exact ownership

Modified existing files: `packages/core/src/{envelope,index,types}.ts`, `packages/core/src/types/global.ts`, `packages/nap/{package.json,jsr.json,tsup.config.ts}`, `packages/sdk/{package.json,jsr.json,tsup.config.ts}`, `packages/sdk/src/{index,nap-runtime,nap-types}.ts`, `packages/shim/src/{runtime,runtime-globals-services}.ts`, and `packages/vite-plugin/src/requirements.ts`.

New files: `packages/core/src/types/navigation.ts`; `packages/nap/src/navigation/{index,types,shim,sdk,shim.test}.ts`; `packages/sdk/src/navigation.ts`; `packages/sdk/test/navigation.test.mjs`; `packages/shim/src/navigation.test.ts`; and `packages/vite-plugin/src/requirements.test.ts`.

No README, conformance, INTENT, STATE, or release files were edited by this executor. No dependencies or suppression rules were added. No stubs remain in these files. Root-import inference retains its existing behavior rather than expanding the generic scanner.

## Self-check

All listed new files exist. No commit is claimed. The parent owns final commits and repository-wide checks.
