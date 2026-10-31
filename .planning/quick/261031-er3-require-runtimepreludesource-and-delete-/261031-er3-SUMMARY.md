---
quick_id: 261031-er3
status: complete
date: 2026-10-31
branch: chore/conformance-require-prelude
commit: e68eddc4
---

# Quick Task 261031-er3: Require runtimePreludeSource and delete the conformance fallback runtime fixture

## What changed

- `packages/conformance/src/run/boot.ts`: `runtimePreludeSource` is required on `BootOptions`. `runtimePrelude` renders only the maintained shim IIFE, the explicit `install({ domains })` call, and the installation probe. Deleted `FALLBACK_RUNTIME_*`, `GAMEPAD_STATE_TOOLS_SOURCE`, and the LLM prelude import.
- Deleted `llm-prelude.ts`, `llm.test.ts`, and `gamepad.test.ts` (fixture and fixture-sync tests).
- `boot.test.ts`: passes a stub source to the happy-dom wiring tests (happy-dom never executes srcdoc) and asserts the rendered prelude shape.
- `bindings.test.ts`: prelude source is required; replaced the fallback case with an allowlist case; added GAMEPAD and LLM round-trips against the reference shell using the real prelude.
- `packages/conformance-cli/src/server.ts`: `BootConfig.runtimePreludeSource` required.
- README and `apps/docs/packages/conformance.md`: removed the embedded-fixture paragraph; folded the `installedGlobal`/`bootError` and signature-verification notes into the `bootAndCollect` paragraph.
- Changeset: `@napplet/conformance` minor.

## Verification

- `pnpm build`: 12/12 tasks green.
- `pnpm type-check`: 19/19 tasks green.
- `pnpm -r test:unit`: all packages green (conformance 214 tests, conformance-cli 34).
- Stale grep for fixture identifiers: only changelog history remains.
- aislop 0.12.0: 98/100, only the pre-existing deepmerge warning.

## Notes

The sibling branch `feat/nap-soulseek` edits the same README paragraph and adds a SOULSEEK fixture block to `boot.ts`; after this lands, that branch should drop its `soulseek-prelude.ts`, `soulseek.test.ts`, and fixture edits rather than re-adding them.
