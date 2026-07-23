# Deferred Items

## 2026-07-23 — Repository-wide SDK build failure

- **Found during:** 161-02 overall verification
- **Scope:** `packages/sdk/src/nap-types.ts:351`
- **Issue:** `@napplet/sdk` still imports the removed `IntentContract` export from
  `@napplet/nap/intent`, so `pnpm build` stops during SDK declaration generation.
- **Disposition:** Out of scope for 161-02. This plan owns only INC convention
  constants, type documentation, and boundary smoke coverage; the active SDK
  migration is owned by a subsequent Phase 161 plan.
