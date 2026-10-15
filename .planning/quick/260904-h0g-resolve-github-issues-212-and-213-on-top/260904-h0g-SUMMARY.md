---
phase: quick-260904-h0g
plan: 01
subsystem: build-transport-and-optimizer
tags: [node-https, deno-fetch, vite, parser-scoped-rewrite, blossom]
requires:
  - phase: 162-blossom-backed-large-asset-optimization
    provides: Retained-asset inventory, deterministic selection pipeline, pinned Node transport, and Deno Blossom upload adapter
provides:
  - Node pinned lookup callbacks compatible with single-result and all-result Node HTTPS requests
  - Deno network deploy runtime-fetch fallback with explicit injection precedence
  - Parser-scoped retained-reference rendering and byte measurements that preserve unrelated text
  - Patch release metadata for @napplet/vite-plugin and @napplet/cli
affects: [vite-plugin-optimizer, cli-network-deploy, blossom-upload, phase-162-verification]
tech-stack:
  added: []
  patterns: [validated-address lookup adapter, inventory-authorized text edits, shared render inventory]
key-files:
  created:
    - packages/vite-plugin/src/optimizer/node-platform.test.ts
    - .changeset/fix-pinned-fetch-and-scoped-render.md
  modified:
    - packages/vite-plugin/src/optimizer/node-platform.ts
    - packages/cli/src/blossom-upload.ts
    - packages/cli/tests/deploy_network_test.ts
    - packages/vite-plugin/src/optimizer/references.ts
    - packages/vite-plugin/src/optimizer/references.test.ts
    - packages/vite-plugin/src/optimizer/pipeline.ts
    - packages/vite-plugin/src/optimizer/pipeline.test.ts
key-decisions:
  - "Classify every pinned endpoint address with Node isIP before opening a socket, preserving endpoint order for all-result lookups and returning the first record for single-result lookups."
  - "Use options.fetch before globalThis.fetch so deterministic callers retain control while normal Deno deployments receive a runtime transport."
  - "Authorize optimizer substitutions through inventory locations and forms, then reuse one inventory for initial, candidate, and final rendering."
patterns-established:
  - "Pinned lookup pattern: validate the full endpoint-owned address inventory once and branch only on the callback's all option."
  - "Scoped rendering pattern: rewrite retained artifact forms first, then embed the rewritten artifact without matching bare asset paths across the document."
requirements-completed: [ISSUE-212, ISSUE-213, ISSUE-214, QUICK-260904-h0g]
duration: 58 min
completed: 2026-09-04
---

# Quick Task 260904-h0g: Resolve Issues #212, #213, and #214 Summary

**Node 22 pinned HTTPS requests, normal Deno uploads, and optimizer byte selection now operate through validated runtime transports and parser-proven reference rewrites without corrupting equal application text.**

## Performance

- **Duration:** 58 min
- **Started:** 2026-09-04T10:39:20Z
- **Completed:** 2026-09-04T11:37:10Z
- **Tasks:** 3 tasks completed, including publication and live PR verification
- **Files modified:** 9 implementation, test, and release files

## Accomplishments

- Fixed Node v22.23.1 HTTPS lookup handling for both `(address, family)` and `addresses[]` callback shapes while rejecting empty or malformed endpoint inventories and never consulting system DNS.
- Restored Deno 2.9.4 network deployment without custom transport injection while preserving caller-provided `fetch` precedence and the existing network policy, hash, retry, rollback, progress, and redaction behavior.
- Replaced global bare-path substitution with inventory-authorized HTML, srcset, CSS, and JavaScript rewrites; baseline, candidate, and final measurements now use the same inventory, and equal strings/comments remain byte-identical.
- Added patch release metadata for `@napplet/vite-plugin` and `@napplet/cli` without changing the base branch's existing minor changeset.
- Opened stacked PR #215 from `fix/issues-212-213` into `feat/vite-plugin-blossom-optimization` with independent closing references for issues #212, #213, and #214.

## Task Commits

Each task was committed atomically with TDD RED and GREEN history:

1. **Task 1 — Node real-path RED:** `05fc1e8f` (`test(quick-260904-h0g): reproduce pinned lookup failure on Node 22`)
2. **Task 1 — Node callback-contract RED:** `f813cd63` (`test(quick-260904-h0g): lock pinned lookup callback contracts`)
3. **Task 1 — Node GREEN:** `efcd7147` (`fix(quick-260904-h0g): keep Node 22 pinned requests usable`)
4. **Task 1 — Deno runtime-fetch RED:** `02dae922` (`test(quick-260904-h0g): reproduce missing Deno fetch default`)
5. **Task 1 — Deno GREEN:** `65bb02b8` (`fix(quick-260904-h0g): let Deno deployments use runtime fetch`)
6. **Task 2 — Collision/measurement RED:** `cfee50bf` (`test(quick-260904-h0g): expose optimizer path-collision corruption`)
7. **Task 2 — Form coverage RED:** `35a5a49b` (`test(quick-260904-h0g): define form-scoped rewrite coverage`)
8. **Task 2 — Scoped rewrite GREEN:** `070814d2` (`fix(quick-260904-h0g): scope optimizer rewrites to inventoried forms`)
9. **Task 3 — Release metadata:** `2d00ce0f` (`chore(quick-260904-h0g): release the transport and renderer fixes`)
10. **Task 2 completion audit — Rendered-location enforcement:** `10bce2c4` (`fix(quick-260904-h0g): bind rendering to indexed HTML locations`)
11. **Node Repair 1 — Fetch-shape RED:** `22bd6df9` (`test(quick-260904-h0g): expose fetch-init deletion hazard`)
12. **Node Repair 1 — Fetch-shape GREEN:** `03492994` (`fix(quick-260904-h0g): align fetch eligibility with rewritable calls`)
13. **Node Repair 2 — CSS provenance RED:** `9c4f4f97` (`test(quick-260904-h0g): expose identical inline CSS provenance collision`)
14. **Node Repair 2 — CSS provenance GREEN:** `18ca16b5` (`fix(quick-260904-h0g): account for stylesheet provenance per occurrence`)
15. **Node Repair 3 — Alias/location RED:** `d81054ee` (`test(quick-260904-h0g): expose alias and repeated srcset gaps`)
16. **Node Repair 3 — Alias/location GREEN:** `4e7965df` (`fix(quick-260904-h0g): retain alias identity for every reference location`)
17. **Node Repair retry — Suffix matching RED:** `8e664d05` (`test(quick-260904-h0g): expose suffixed reference matching gaps`)
18. **Node Repair retry — Suffix matching GREEN:** `1e954edd` (`fix(quick-260904-h0g): preserve suffixed emitted references`)

**Plan metadata:** Included with this summary, the validated plan, the final 6/6 verification report, and the state record in the final metadata commit.

## RED Evidence

- Node integration RED on v22.23.1 reached the real `node:https.request()` path and failed at the legacy custom lookup with `TypeError: Invalid IP address: undefined`; the direct all/single/validation cases also failed before `_createPinnedLookup` existed.
- Deno deploy RED on 2.9.4 ran 9 passing tests and 1 failing regression; the no-override deployment recorded `[]` instead of the expected `HEAD` and `PUT` calls and skipped relay publication.
- Optimizer collision RED ran 17 passing tests and 1 failing regression; the renderer replaced the supported sentinel plus the equal ordinary string and comment instead of producing one data URI.
- Reference rewrite RED ran 11 existing passes and 11 expected failures because the form-scoped rewrite API did not yet exist.
- Node Repair fetch-shape RED selected an asset referenced by `fetch(__nappletAssetUrl(...), init)` even though the renderer could not preserve its second argument.
- Node Repair CSS-provenance RED selected an asset after one external stylesheet body incorrectly blessed an identical inline `<style>` occurrence.
- Node Repair alias/location RED recorded only one of three root-relative HTML references and omitted the root-relative `src` form.
- Node Repair retry RED recorded zero references for query/fragment-bearing HTML, repeated srcset, CSS, and supported JavaScript forms and left the suffixed output unchanged.

## Verification

- `pnpm --dir packages/vite-plugin exec vitest run --config vitest.config.ts src/optimizer/node-platform.test.ts src/optimizer/references.test.ts src/optimizer/pipeline.test.ts` — PASS, 3 files and 51 tests.
- `deno test --config packages/cli/deno.json --allow-read --allow-write --allow-run --allow-env packages/cli/tests/deploy_network_test.ts` — PASS, 10 tests.
- `pnpm build` — PASS, 14 Turbo build tasks.
- `pnpm type-check` — PASS, 21 Turbo type-check/build tasks.
- `pnpm -r test:unit` — PASS across all configured workspace unit suites, including CLI 123/123 and vite-plugin 102/102.
- `pnpm lint` — PASS; the repository currently defines zero Turbo lint tasks.
- `CI=true pnpm dlx aislop@0.12.0 scan --changes --base origin/feat/vite-plugin-blossom-optimization .` — PASS, 100/100 with zero errors and one non-blocking 472-line file-size warning for `references.ts`.
- `git diff --check origin/feat/vite-plugin-blossom-optimization...HEAD` — PASS.
- `sha256sum --check --status /tmp/napplet-260904-h0g-config.sha256` — PASS; the unrelated `packages/cli/.napplet/config.json` remains unchanged, untracked, unprinted, and uncommitted.
- `git merge-base --is-ancestor origin/feat/vite-plugin-blossom-optimization HEAD` — PASS at local implementation head `1e954edd`.
- Live PR #215 verification — PASS before the final metadata commit: OPEN, non-draft, exact requested head/base, local/remote/PR head OIDs equal at `1e954edd`, and the body contains all three independent `Fixes` lines plus the complete verification evidence.

## Runtime Versions

- Node: `v22.23.1`
- Deno: `2.9.4` stable, V8 `15.0.245.2-rusty`, TypeScript `6.0.3`

## Files Created/Modified

- `packages/vite-plugin/src/optimizer/node-platform.ts` — Validates endpoint-owned IP records and implements both Node lookup callback shapes.
- `packages/vite-plugin/src/optimizer/node-platform.test.ts` — Covers direct lookup shapes, invalid inventories, and a real loopback HTTPS request.
- `packages/cli/src/blossom-upload.ts` — Selects caller-injected fetch or Deno runtime fetch at the upload adapter boundary.
- `packages/cli/tests/deploy_network_test.ts` — Proves no-override runtime fetch behavior while existing injected transport cases remain green.
- `packages/vite-plugin/src/optimizer/references.ts` — Applies inventory-authorized, form-specific text and CSS rewrites.
- `packages/vite-plugin/src/optimizer/references.test.ts` — Covers recognized HTML, srcset, CSS, and JavaScript forms against equal opaque text.
- `packages/vite-plugin/src/optimizer/pipeline.ts` — Reuses one inventory for baseline, candidate, and final rendering and embeds only rewritten retained artifacts.
- `packages/vite-plugin/src/optimizer/pipeline.test.ts` — Pins collision output, one-data-URI baseline bytes, target selection boundaries, and selected measurements.
- `.changeset/fix-pinned-fetch-and-scoped-render.md` — Adds patch release notes for both affected packages.

## Decisions Made

- The Node lookup adapter validates all records up front with `isIP`, preserving the validated endpoint order and failing before socket creation for empty or malformed inputs.
- The Deno fix remains a one-boundary fallback in the shared upload service call; transport injection stays authoritative and no other deploy behavior changes.
- Reference rewrite authority is the retained inventory's artifact path, location, and form. Whole-artifact embedding is used only after form-scoped edits; a bare asset path is never used as whole-document rewrite proof.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan-fidelity bug] Removed the remaining whole-document artifact embedding step**
- **Found during:** Task 3 completion audit
- **Issue:** Parser-scoped edits were initially embedded with `replaceAll` over the HTML document, which was narrower than a bare-path rewrite but did not meet the plan's stronger prohibition on whole-document textual replacement.
- **Fix:** Added rendered HTML itself to the reference inventory, recorded embedded JavaScript and stylesheet offsets/forms, and applied all edits directly by those locations.
- **Files modified:** `packages/vite-plugin/src/optimizer/references.ts`, `packages/vite-plugin/src/optimizer/pipeline.ts`, `packages/vite-plugin/src/optimizer/pipeline.test.ts`
- **Verification:** Targeted reference/pipeline tests 41/41, vite-plugin type-check/build, full repository gates, and clean AI-slop 100/100.
- **Committed in:** `10bce2c4`

**Total deviations:** 1 auto-fixed (1 Rule 1 bug).

**Impact on plan:** The correction strengthens the requested parser/location boundary without adding scope or protocol surface.

### [Node Repair - DECOMPOSE] Task 2 split into 3 sub-tasks — all passed

**1. Fetch shape coherence**
- **RED:** `22bd6df9` proved a two-argument fetch sentinel was selected although the response rewrite only handled the one-argument shape.
- **GREEN:** `03492994` makes only exactly rewritable one-argument fetch sentinels supported; fetch-init calls remain inline with their semantics intact.
- **Evidence:** Focused references/pipeline suites passed after the correction and the final targeted suite passed 49/49.

**2. Inline/external CSS identity**
- **RED:** `9c4f4f97` proved content equality allowed one external stylesheet body to bless an identical inline style URL.
- **GREEN:** `18ca16b5` consumes matching external stylesheet provenance per occurrence; identical excess style bodies remain inline-only and prevent asset deletion.
- **Evidence:** Existing external stylesheet tests and the new mixed-provenance regression pass in the final 100-test vite-plugin suite.

**3. Aliases and repeated locations**
- **RED:** `d81054ee` proved root-relative aliases and repeated srcset candidates produced one location instead of three and omitted html-attribute provenance.
- **GREEN:** `4e7965df` separates canonical asset identity from the emitted matched value and records each parsed srcset candidate independently.
- **Evidence:** Three distinct alias locations rewrite to three data URIs, the asset remains ineligible for deletion, and unrelated equal text is preserved.

**Node Repair impact:** All three bounded compatibility repairs are complete with no new dependency, protocol surface, or public package entry point.

### [Node Repair - RETRY] Task 2: preserve query/fragment reference matching — resolved

- **RED:** `8e664d05` proved root-relative references carrying `?query` and `#fragment` suffixes produced no inventory entries across HTML `src`, repeated `srcset`, stylesheet `url(...)`, and supported JavaScript fetch sentinels.
- **GREEN:** `1e954edd` strips query/fragment suffixes only for canonical asset lookup, records the emitted base alias at exact parser locations, preserves suffix bytes during baseline value rewrites, and replaces a supported suffixed fetch sentinel as one complete loader-response call.
- **Evidence:** Focused references/pipeline tests passed 47/47; final node/references/pipeline tests passed 51/51; full vite-plugin unit suite passed 102/102; vite-plugin build/type-check and every repository gate passed.
- **Risk:** Baseline rewriting intentionally retains query/fragment suffix bytes after the replacement to preserve existing renderer behavior; selected supported fetch calls use the canonical resource source because the complete fetch call is replaced.

## Issues Encountered

- The non-required `pnpm changeset status` helper hits the repository's existing `read-yaml-file` / `js-yaml` `safeLoad` incompatibility. The changeset itself was inspected, committed by explicit path, and all required build, type, unit, lint, diff, and AI-slop gates pass; no dependency change was made because that incompatibility is outside this task.
- One AI-slop invocation printed its complete 100/100 result but retained an idle process handle after the verdict; the process was terminated after the result was captured. A prior `CI=true` invocation exited cleanly, and the final scan reported a clean 100/100 with zero issues on the final source.

## Remaining Risks

- The HTTPS integration fixture intentionally disables certificate verification only inside its test `try/finally`; it proves Node's real socket path but does not exercise an external public Blossom server.
- AI-slop reports `references.ts` at 472 lines as a non-blocking file-size warning. Splitting this parser/rewrite module is unrelated structural cleanup and was not mixed into the compatibility repairs.

## User Setup Required

None - no external service configuration is required.

## Next Phase Readiness

Implementation, regression, release, full-gate, checksum, ancestry, and publication evidence are complete. PR #215 is open against the requested feature base with all three issue-closing lines; the final metadata commit only needs a non-force push and live head/body refresh.

## Self-Check: PASSED

- All 9 implementation/test/release files exist.
- All 18 task and Node Repair commits resolve as commits in local history.
- Required targeted and repository gates pass on the committed implementation head.
- The unrelated CLI config checksum still matches and the file remains uncommitted.
- GSD verification reports 6/6 must-haves passed, and live PR #215 satisfies the stacked publication contract.

---
*Quick task: 260904-h0g*
*Completed: 2026-09-04*
