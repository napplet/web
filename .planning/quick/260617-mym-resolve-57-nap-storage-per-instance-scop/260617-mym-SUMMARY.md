---
quick_id: 260617-mym
description: Resolve #57 (NAP-STORAGE per-instance scope) and #58 (NAAT archetype manifest tag)
status: complete
branch: feat/storage-scope-and-archetype-tag
commits:
  - 68ce679 feat(nap): per-instance storage scope (#57)
  - e63ee78 feat(vite-plugin): emit NAAT archetype manifest tag (#58)
---

# Quick Task 260617-mym Summary

Implemented two spec-backed NAP gaps exactly to the canonical text quoted in
the PLAN. No protocol surface was invented; no spec gap was hit.

## Task 1 — #57 NAP-STORAGE per-instance scope (commit 68ce679)

The only wire-level addition is an optional `scope` field; `instance.*` is sugar
that sets `scope: "instance"`. Shared (top-level) calls emit **no** `scope` field
so they are byte-identical to prior versions. Result messages carry no `scope`.

Per file:

- **packages/nap/src/storage/types.ts** — added `export type StorageScope =
  'shared' | 'instance'`; added `scope?: StorageScope` (default "shared") to
  `StorageGetMessage`, `StorageSetMessage`, `StorageRemoveMessage`,
  `StorageKeysMessage`. `*ResultMessage` types untouched.
- **packages/nap/src/storage/shim.ts** — extracted scope-aware private builders
  (`getItemScoped`/`setItemScoped`/`removeItemScoped`/`keysScoped`). When
  `scope === 'instance'` the `scope` key is spread onto the envelope; otherwise
  it is omitted entirely. Top-level `nappletStorage.{getItem,setItem,removeItem,
  keys}` delegate with no scope; new `nappletStorage.instance.*` delegates with
  `'instance'`. Public top-level signatures unchanged.
- **packages/core/src/types/global/nostr-api.ts** — added exported
  `interface NappletInstanceStorage` (four methods) and added
  `instance: NappletInstanceStorage` to `StorageApi`, both with non-normative
  JSDoc deferring to NAP-STORAGE.
- **packages/core/src/types/global.ts** — re-exported `NappletInstanceStorage`
  from `./global/nostr-api.js` (the barrel re-exports `global.js` via
  `export type *`). Note: `StorageApi` itself is not in the core barrel today;
  `NappletInstanceStorage` is exported explicitly per the PLAN.
- **packages/core/src/index.ts** — added `NappletInstanceStorage` to the
  `./types.js` type re-export list.
- **packages/nap/src/storage/sdk.ts** — added `storageInstanceGetItem`,
  `storageInstanceSetItem`, `storageInstanceRemoveItem`, `storageInstanceKeys`
  delegating to `requireStorage().instance.*` (same JSDoc/@example style).
- **packages/nap/src/storage/index.ts** — exported the four new SDK helpers and
  the `StorageScope` type.
- **packages/shim/src/index.ts** — added `instance: { getItem/setItem/
  removeItem/keys }` to the `storage` object, bound to `nappletStorage.instance.*`.
- **packages/sdk/src/relay.ts** — added `instance` sub-object to the exported
  `storage` object, delegating to `requireNapplet().storage.instance.*`.
- **packages/sdk/src/nap-runtime.ts** — re-exported the four new instance helpers
  next to the existing storage helpers.
- **packages/nap/src/storage/shim.test.ts** (NEW) — 3 tests:
  1. top-level `getItem/setItem/removeItem/keys` emit envelopes with **no**
     `scope` field (asserts `'scope' in msg === false`) — backward-compat guard.
  2. `instance.*` emit envelopes with `scope: 'instance'`.
  3. results correlate by `id` (out-of-order resolution) and `error` rejects.
- **Docs** — apps/docs/packages/shim.md, apps/docs/packages/sdk.md,
  packages/shim/README.md (API table + type block + wire-shape `scope?`),
  packages/sdk/README.md (storage table) now list the `instance.*` surface.
- **Changeset** — .changeset/nap-storage-per-instance-scope.md (core/nap/shim/sdk,
  minor; additive).

## Task 2 — #58 NAAT archetype manifest tag (commit e63ee78)

A napplet declares roles via `["archetype", slug, ...naps]` manifest tags. The
tag is excluded from the aggregate `x` hash — identical treatment to `config`.

Per file:

- **packages/vite-plugin/src/types.ts** — added
  `archetypes?: Array<string | { slug: string; naps?: string[] }>` to
  `Nip5aManifestOptions` with non-normative JSDoc (string shorthand `"feed"` ≡
  `{ slug: "feed" }`; excluded from the aggregate hash; defer to ARCHETYPES.md).
- **packages/vite-plugin/src/manifest.ts** — added `buildArchetypeTags`
  normalizer (accepts both forms, skips blank slugs, maps to
  `['archetype', slug, ...naps]`). `archetypeTags` appended to the `tags` array
  after `configTags`/`requiresTags`; **not** passed to `computeAggregateHash`
  (only `pathPairs` feed the aggregate, mirroring the existing config comment).
- **packages/vite-plugin/README.md** — documented the `archetypes` option with
  object + shorthand examples and the "does not affect the aggregate hash" note,
  placed right after the `configSchema` section.
- **packages/vite-plugin/src/index.test.ts** — added a test (mirrors the config
  aggregate-exclusion test) asserting one tag per role
  (`['archetype','feed','NAP-4']` + `['archetype','note']` in declared order),
  that the base (no-archetypes) build emits no archetype tag, and that the
  aggregate hash is byte-identical across identical dist bytes with vs without
  archetypes (only `x` tag stays the path aggregate).
- **Changeset** — .changeset/naat-archetype-manifest-tag.md (vite-plugin, minor;
  additive).

## Verification (all green)

### pnpm build
```
 Tasks:    11 successful, 11 total
 Cached:    2 cached, 11 total
  Time:    11.384s
```

### pnpm type-check
```
 Tasks:    15 successful, 15 total
 Cached:    7 cached, 15 total
  Time:    2.11s
```

### pnpm -r test:unit (relevant packages)
```
packages/nap test:unit:       Tests  64 passed (64)        (was 60 — +3 storage shim tests; 12 test files)
packages/vite-plugin test:unit:       Tests  9 passed (9)  (was 8 — +1 archetype test)
packages/core test:unit:       Tests  23 passed (23)
packages/shim test:unit:       Tests  11 passed (11)
packages/conformance test:unit:       Tests  62 passed (62)
packages/conformance-cli test:unit:       Tests  11 passed (11)
```
All packages pass.

### AI-slop gate (aislop@0.12.0, the version pinned in .github/workflows/ai-slop.yml)
```
SCORE: 89   LABEL: Healthy
diagnostics: 2
  - error   security/vulnerable-dependency  vite (high)     — Upgrade to 6.4.3+ (2 advisories)
  - warning security/vulnerable-dependency  js-yaml (mod.)  — Upgrade to 4.2.0+
byKind: confirmed-defect 2, conservative-security 0, style-policy 0, ai-slop-indicator 0
```
Score unchanged from baseline (89/Healthy). **Both diagnostics are pre-existing
environmental dependency advisories** (vite, js-yaml; `file: None`), already
documented as out-of-scope in STATE.md across the v0.31.0/v0.33.0 milestones —
they are not introduced by this work, and the slop engine attributes **zero**
code-quality / ai-slop / style findings to the files changed here
(`ai-slop-indicator: 0`, `style-policy: 0`). Resolving them requires a dependency
bump (`vite` → 6.4.3+ via the root pnpm override, `js-yaml` → 4.2.0+), which is a
separate dep-bump task (precedent: v0.31.0 / Phase 143) and out of scope for this
spec-faithful feature work. The CI gate passes (`minimum-score: 70`).

No rule disables were added (`.aislop/config.yml` is empty/pinned and untouched).

## Deviations from plan

None of substance. Two clarifications:

- The PLAN said to "mirror how `StorageApi` is re-exported" for
  `NappletInstanceStorage`. `StorageApi` is in fact NOT re-exported from the
  core barrel (only `NappletGlobal` is). Per the PLAN's explicit instruction to
  "ensure `NappletInstanceStorage` is exported", it is exported explicitly via a
  `export type { NappletInstanceStorage }` line in `global.ts` plus the
  `index.ts` barrel entry — type-check confirms the export resolves.
- The storage shim resolves results via a `window.addEventListener('message')`
  listener (not a `handleXxxMessage` export like the media sibling), so the new
  test installs the shim and feeds results through a mocked message listener with
  `source: window.parent`, rather than calling a handler directly. Same coverage
  intent (envelope shape out, correlation/error in).

## Flagged spec gaps

None. Every change maps to the verbatim canonical text quoted in the PLAN
(NAP-STORAGE scope field + instance sugar; NAAT `["archetype", slug, ...naps]`
tag excluded from the aggregate). No undocumented protocol surface was added.

## Not committed (per instructions)

- `.planning/**` (orchestrator commits docs) — this SUMMARY is written but not
  committed.
- `.playwright-mcp/` — left untouched.
