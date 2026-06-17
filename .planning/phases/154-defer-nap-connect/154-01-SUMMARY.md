---
phase: 154-defer-nap-connect
plan: 01
subsystem: protocol-sdk
tags: [defer, nap-connect, breaking-change, conformance, vite-plugin]
requires:
  - DEFER-01 (NAP-CLASS deferral, commit 9aa4b80 — the mirror template)
provides:
  - "Clean active surface with no first-party connect domain (runtime/build/conformance)"
  - "NAP_DOMAINS reduced to 14 entries (relay..intent, no connect)"
affects:
  - "Phase 155 (NAP-SHELL) — clears perm:/sandbox capability tokens for the {domains, protocols} shape"
tech-stack:
  added: []
  patterns:
    - "Mirror-the-shipped-deferral pattern: replicate 9aa4b80 (class) edits for connect, then extend to vite-plugin + conformance-manifest"
key-files:
  created: []
  modified:
    - packages/core/src/envelope.ts
    - packages/core/src/types/global.ts
    - packages/core/src/types/global/runtime-api.ts
    - packages/core/README.md
    - packages/nap/package.json
    - packages/nap/jsr.json
    - packages/nap/tsup.config.ts
    - packages/nap/README.md
    - packages/sdk/src/nap-runtime.ts
    - packages/sdk/src/nap-types.ts
    - packages/sdk/README.md
    - packages/shim/src/index.ts
    - packages/shim/README.md
    - packages/vite-plugin/src/types.ts
    - packages/vite-plugin/src/manifest.ts
    - packages/vite-plugin/src/index.ts
    - packages/vite-plugin/src/index.test.ts
    - packages/vite-plugin/tsconfig.json
    - packages/vite-plugin/README.md
    - packages/conformance/src/validators/manifest.ts
    - packages/conformance/src/validators/manifest.test.ts
    - packages/conformance/src/validators/envelope.ts
    - packages/conformance/src/validators/envelope.test.ts
    - packages/conformance/src/validators/envelope.drift.test.ts
    - packages/conformance/src/checks/catalog.ts
    - packages/conformance/src/checks/catalog.test.ts
    - packages/conformance/README.md
    - apps/conformance/src/main.ts
    - apps/docs/naps/index.md
    - apps/docs/packages/core.md
    - apps/docs/packages/nap.md
    - apps/docs/packages/sdk.md
    - apps/docs/packages/vite-plugin.md
  deleted:
    - packages/nap/src/connect/ (index.ts, types.ts, shim.ts, sdk.ts, aggregate-hash.test.ts, shim.test.ts, __fixtures__/*.md)
    - packages/vite-plugin/src/connect.ts
decisions:
  - "nap.md tree-shaking count corrected to the REAL 60 entry points / 15 barrels (not the plan's naive 56/14) — @napplet/nap also ships a legacy `ifc` subpath beyond the 14 NAP_DOMAINS, so 15 export-domains × 4 = 60. No-drift over the plan's stale estimate."
  - "ENVELOPE_SPECS discriminant invariant stays at 122 / 60-out / 62-in — connect was wire-less (zero envelope specs), so removing it does not change envelope counts."
  - "Cleaned two orphaned NAP-CLASS doc references the shipped 9aa4b80 commit missed (sdk.md getClass/class bullet, vite-plugin/README NAP-CLASS See-also) while editing those files, per zero-drift."
metrics:
  duration: "~1h"
  completed: "2026-06-17"
---

# Phase 154 Plan 01: Defer NAP-CONNECT Summary

Removed the `connect` (NAP-CONNECT) domain from the repo's entire active first-party surface — core runtime types, the `@napplet/nap/connect` subpath, shim install, sdk re-exports, the `@napplet/vite-plugin` build/manifest machinery, and the conformance manifest validator — keeping `pnpm build`, `pnpm type-check`, and `pnpm -r test:unit` GREEN while NIP-5A manifest generation still works. This is the exact mirror of the already-shipped NAP-CLASS deferral (commit `9aa4b80`), extended to the two surfaces `class` did not have (vite-plugin + conformance-manifest).

## What changed

- **@napplet/core (DEFER-02):** Dropped `'connect'` from the `NapDomain` union and `NAP_DOMAINS` (now **14** entries: relay, identity, storage, inc, theme, keys, media, notify, config, resource, cvm, outbox, upload, intent). Removed `window.napplet.connect` (`ConnectApi`) from `NappletGlobal` and deleted the `ConnectApi` interface. Stripped the orphaned `perm:strict-csp` deprecation prose that cited `nap:connect`, keeping `perm:popups` and the `perm:${string}` template member.
- **@napplet/nap (DEFER-02):** Deleted `packages/nap/src/connect/` wholesale (incl. `__fixtures__/` and tests). Removed the four `./connect*` export blocks from `package.json`, `jsr.json`, and `tsup.config.ts`.
- **@napplet/sdk + @napplet/shim (DEFER-02):** Removed the connect re-exports from `nap-runtime.ts` / `nap-types.ts`, and the `installConnectShim` import/call + connect literal field from the shim.
- **@napplet/vite-plugin (DEFER-03):** Deleted `src/connect.ts` (`normalizeConnectOptions`). Removed the `connect?: string[]` option, `normalizedConnect` state field, and the now-orphaned `strictCsp?: unknown` deprecated field. Stripped connect manifest tags, the dev-only `napplet-connect-requires` meta, and the `strictCsp` warn. NIP-5A manifest generation still emits path + aggregate `x` + config tags (verified by the narrowed aggregate-exclusion test). Removed the stale `@napplet/nap/connect/types` path mapping from `tsconfig.json`.
- **@napplet/conformance (DEFER-04):** Removed the `normalizeConnectOrigin` import (deleted module), the `invalid-connect-origin` code, the `connectOrigins` field, and the `napplet-connect-requires` parse/validate block from `validateManifest`. Deleted the `manifest/connect-origins` catalog check and its tests. Dropped the dead `connect` special-case from the envelope drift guard (every NAP domain now asserted to have wire specs) and removed the `connect.*` envelope-rejection test.
- **Docs:** Removed connect rows/sections across `apps/docs/naps/index.md`, `core.md`, `nap.md`, `sdk.md`, `vite-plugin.md`; corrected the `nap.md` tree-shaking count to the real 60 entry points / 15 barrels.
- **apps/conformance web:** Removed the connect-origins row from the manifest inspector (downstream consumer of the removed `connectOrigins` field).

## Final NAP_DOMAINS (14)

```
relay, identity, storage, inc, theme, keys, media, notify, config, resource, cvm, outbox, upload, intent
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stale tsconfig path mapping**
- **Found during:** Task 6 (broad residue grep)
- **Issue:** `packages/vite-plugin/tsconfig.json` still mapped `@napplet/nap/connect/types` to the deleted source file.
- **Fix:** Removed the path entry.
- **Commit:** 763b84f

**2. [Rule 3 - Blocking] Downstream consumer of removed `connectOrigins`**
- **Found during:** Task 6 (type-check)
- **Issue:** `apps/conformance/src/main.ts` rendered `m.connectOrigins`, which no longer exists on `ManifestVerdict` (TS2339).
- **Fix:** Removed the connect-origins row from the manifest inspector table.
- **Commit:** 763b84f

**3. [Rule 1 - Test sync] Catalog-size assertion drift**
- **Found during:** Task 6 (unit tests)
- **Issue:** `runner.test.ts` asserted 13 catalog checks; removing `manifest/connect-origins` made it 12.
- **Fix:** Updated the assertion 13 → 12.
- **Commit:** 763b84f

### Plan-estimate corrections (no-drift over the plan)

- **nap.md count:** The plan instructed "56 entry points / 14 barrels". The real `@napplet/nap` exports map has **60 entries / 15 barrels** because the package ships a legacy `ifc` subpath beyond the 14 `NAP_DOMAINS`. Used the accurate figure.
- **Envelope invariant:** The plan flagged the `"has N discriminants split…"` test for an update, but `connect` was wire-less (zero `ENVELOPE_SPECS` entries), so the count stayed at 122 / 60-out / 62-in — no change needed.
- **Orphaned NAP-CLASS doc refs:** While editing `sdk.md` and `vite-plugin/README.md` I removed two stale `class`/`getClass`/`NAP-CLASS` references that the shipped `9aa4b80` commit had missed (those docs files were not in its diff).

## Verification

- `pnpm build` — 11 tasks successful (exit 0).
- `pnpm type-check` — 15 tasks successful (exit 0).
- `pnpm -r test:unit` — all green (vite-plugin 7, shim 7, conformance 63, conformance-cli 8, plus core/nap/sdk suites); zero failures workspace-wide.
- Canonical 4-token residue grep (`window.napplet.connect`, `normalizeConnectOrigin`, `napplet-connect-requires`, `connect-origins`) — zero first-party matches (CHANGELOG + dist excluded).
- Broad residue grep (`NAP-CONNECT|window.napplet.connect|nap/connect|napplet-connect|normalizeConnect|connect-origins|connect-requires|'connect'|"connect"`) — zero matches across `packages` + `apps` (CHANGELOG + dist excluded).

## Commits

- `5dcd976` feat(core)!: remove connect from NAP_DOMAINS/NapDomain + runtime global
- `2441b74` feat(nap)!: delete @napplet/nap/connect subpath + sdk re-exports + shim install
- `9e51727` feat(vite-plugin)!: remove connect option + manifest tags + strictCsp
- `bbfdea4` feat(conformance)!: remove connect-origins check + normalizeConnectOrigin dep
- `32f736e` docs(154-01)!: remove connect rows from the docs site
- `763b84f` fix(154-01): clear residual connect consumers after deferral

## Self-Check: PASSED
