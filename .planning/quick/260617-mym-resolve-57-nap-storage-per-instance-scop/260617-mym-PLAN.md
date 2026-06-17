---
quick_id: 260617-mym
description: Resolve #57 (NAP-STORAGE per-instance scope) and #58 (NAAT archetype manifest tag)
status: ready
---

# Quick Task 260617-mym

Resolve two NAP-modernization gaps surfaced during the hyprgate v3.0 migration.
Both are **spec-backed** — exact canonical text is quoted inline below so no
re-fetch is needed. Do NOT invent surface beyond what is quoted (AGENTS.md
rule 1).

## Canonical references (source of truth — verified 2026-06-17)

### #57 — NAP-STORAGE per-instance scope
Draft NAP-STORAGE, `napplet/naps` PR #3 branch `nub-storage`, merge commit
`6855b35` (merged PR #43 "per-instance storage scope"). Verbatim spec:

- Wire: *"Every request carries an optional `scope`: `"shared"` (default) or
  `"instance"`. It is the only wire-level addition for per-instance storage; the
  `instance.*` API is sugar that sets `scope: "instance"`."*
- Request payloads gain `scope?`:
  - `storage.get` → `id`, `key`, `scope?`
  - `storage.set` → `id`, `key`, `value`, `scope?`
  - `storage.remove` → `id`, `key`, `scope?`
  - `storage.keys` → `id`, `scope?`
- Result messages carry **no** `scope` (correlation `id` already identifies the
  request). Do NOT add `scope` to any `*.result` type.
- API surface:
  ```typescript
  interface NappletStorage {
    getItem(key): Promise<string | null>;
    setItem(key, value): Promise<void>;
    removeItem(key): Promise<void>;
    keys(): Promise<string[]>;
    instance: NappletInstanceStorage; // identical surface, scope:"instance"
  }
  interface NappletInstanceStorage {
    getItem(key): Promise<string | null>;
    setItem(key, value): Promise<void>;
    removeItem(key): Promise<void>;
    keys(): Promise<string[]>;
  }
  ```
- `"shared"` is the DEFAULT. A request with `scope` absent MUST behave exactly
  as today (backward compatible). Top-level methods omit `scope` entirely (do
  not emit `scope:"shared"` on the wire — keep absent to preserve byte-identical
  behavior for existing shells). `instance.*` sets `scope:"instance"`.

### #58 — NAAT archetype manifest tag
`napplet/naps` `ARCHETYPES.md` (master). Verbatim:
- *"A napplet declares the roles it fulfills in its NIP-5A manifest:
  `["archetype", "note", "NAP-4"]`  // role slug, then the NAP-N wire format(s)
  it accepts for that role. A napplet may declare several archetype tags. A
  napplet with no archetype tag is fully valid."*
- Tag shape: `["archetype", slug, ...naps]` — one tag per declared role.
- The tag MUST NOT feed the aggregate `x` hash — identical treatment to the
  `config` tag (NIP-5D §Identity: aggregate is recomputed from `path` tags
  ALONE). This is already how `config`/`requires` tags are handled in
  `buildManifestTemplate`.

---

## Task 1 — #57: NAP-STORAGE per-instance scope

**files:**
- `packages/nap/src/storage/types.ts`
- `packages/nap/src/storage/shim.ts`
- `packages/nap/src/storage/sdk.ts`
- `packages/nap/src/storage/index.ts`
- `packages/core/src/types/global/nostr-api.ts`
- `packages/shim/src/index.ts`
- `packages/sdk/src/relay.ts`
- `packages/sdk/src/nap-runtime.ts`
- `packages/nap/src/storage/shim.test.ts` (NEW)

**action:**

1. `types.ts`:
   - Add an exported scope type:
     `export type StorageScope = 'shared' | 'instance';`
   - Add `scope?: StorageScope;` (JSDoc: default `"shared"`) to
     `StorageGetMessage`, `StorageSetMessage`, `StorageRemoveMessage`,
     `StorageKeysMessage`. Do NOT touch any `*ResultMessage`.

2. `shim.ts` (`nappletStorage`):
   - Refactor the four methods to accept an internal `scope?: StorageScope` and,
     when `scope === 'instance'`, include `scope` on the outgoing message;
     otherwise omit it entirely (no `scope` key on the wire).
   - Add an `instance` member implementing the same four methods with
     `scope: 'instance'`. Keep top-level methods' public signatures unchanged
     (`getItem(key)`, etc.) — instance scope is reached only via `.instance.*`,
     matching the spec's "sugar that sets scope:'instance'". A private helper
     (e.g. `get(key, scope?)`) shared by both surfaces is fine.
   - Import `StorageScope` from `./types.js`.

3. `core/src/types/global/nostr-api.ts` (`StorageApi`):
   - Add `instance: NappletInstanceStorage;` member with JSDoc explaining
     per-instance scope (paraphrase the spec; mark non-normative).
   - Add and export `interface NappletInstanceStorage` with the four methods.
   - Ensure `NappletInstanceStorage` is exported from `@napplet/core`'s barrel
     (`packages/core/src/index.ts`) alongside the other `*Api` types — check how
     `StorageApi` is re-exported and mirror it.

4. `sdk.ts` (`@napplet/nap/storage` helpers): add four instance helpers
   delegating to `requireStorage().instance.*`:
   `storageInstanceGetItem`, `storageInstanceSetItem`,
   `storageInstanceRemoveItem`, `storageInstanceKeys` — same JSDoc style/`@example`
   as the existing helpers.

5. `storage/index.ts`: export the four new SDK helpers and the `StorageScope`
   type (`export type { ... StorageScope }`).

6. `shim/src/index.ts`: the `storage:` object (around line 204) gains an
   `instance: { getItem/setItem/removeItem/keys }` bound to
   `nappletStorage.instance.*`, mirroring the existing four bound methods.

7. `sdk/src/relay.ts`: the exported `storage` object gains an `instance` sub-object
   delegating to `requireNapplet().storage.instance.*` (mirror existing methods).

8. `sdk/src/nap-runtime.ts`: re-export the four new instance helpers next to the
   existing `storageGetItem, storageSetItem, storageRemoveItem, storageKeys`.

9. NEW `packages/nap/src/storage/shim.test.ts` (follow the structure of a
   sibling, e.g. `packages/nap/src/media/shim.test.ts` — mock `window.parent`
   postMessage, install shim, assert outgoing envelope shape and resolve on the
   matching `.result`). Assert:
   - top-level `getItem/setItem/removeItem/keys` emit messages with **no**
     `scope` field (backward compat).
   - `instance.getItem/setItem/removeItem/keys` emit messages with
     `scope: 'instance'`.
   - correlation by `id` resolves the right promise; `error` rejects.

**verify:**
- `pnpm -r test:unit` green (new storage test passes).
- `pnpm type-check` green (instance surface typed end-to-end: core → nap → shim → sdk).
- `pnpm build` green.

**done:** A napplet can call `window.napplet.storage.instance.setItem(...)` and
the wire carries `scope:"instance"`; top-level calls remain byte-identical
(no `scope`). Types compile across all four packages.

## Task 2 — #58: NAAT archetype manifest tag

**files:**
- `packages/vite-plugin/src/types.ts`
- `packages/vite-plugin/src/manifest.ts`
- `packages/vite-plugin/README.md`
- `packages/vite-plugin/src/index.test.ts`

**action:**

1. `types.ts` (`Nip5aManifestOptions`): add optional
   `archetypes?: Array<string | { slug: string; naps?: string[] }>;`
   JSDoc: declares NAAT roles per `napplet/naps` `ARCHETYPES.md`; emits one
   `["archetype", slug, ...naps]` NIP-5A manifest tag per role; excluded from the
   aggregate `x` hash (same as `config`). Shorthand `"feed"` ≡ `{ slug: "feed" }`
   (no naps). Reference the ARCHETYPES.md spec, mark non-normative.

2. `manifest.ts` `buildManifestTemplate`:
   - Add a small normalizer: map each entry to `['archetype', slug, ...(naps ?? [])]`,
     accepting both the string shorthand and the object form. Skip empty/blank
     slugs.
   - Build `archetypeTags` and append them to the `tags` array AFTER `configTags`
     / `requiresTags`. They are NOT passed to `computeAggregateHash` (only
     `pathPairs` feed the aggregate — keep it that way; mirror the existing
     comment that config/capability tags must not feed the aggregate).

3. `README.md`: document the `archetypes` option with the
   `[{ slug: "feed", naps: ["NAP-4"] }]` and shorthand `["feed"]` examples, and
   note the tag does not affect the aggregate hash. Place near the existing
   options docs.

4. `index.test.ts`: add a test (mirror the
   "excludes config from the NIP-5A aggregate but still emits its tag" test):
   - emits one `["archetype", slug, ...naps]` tag per declared role (object form
     with naps + shorthand string form).
   - declaring archetypes does NOT change `aggregateHash` vs an identical-bytes
     build without archetypes (the only `x` tag stays the path aggregate).

**verify:**
- `pnpm -r test:unit` green (new manifest test passes).
- `pnpm type-check` green.
- `pnpm build` green.

**done:** `nip5aManifest({ nappletType, archetypes: [{ slug:"feed", naps:["NAP-4"] }, "note"] })`
emits `["archetype","feed","NAP-4"]` and `["archetype","note"]` into the
kind-35129 manifest, and the aggregate hash is unchanged.

## Cross-cutting (both tasks)

- **Changesets** (`.changeset/*.md`) — bump packages whose **shipped output**
  changes (AGENTS.md §6; 0.x breaking = minor, additive = minor/patch as fits):
  - #57: `@napplet/core`, `@napplet/nap`, `@napplet/shim`, `@napplet/sdk`
    (all ship new instance surface) — additive → `minor`.
  - #58: `@napplet/vite-plugin` (new option + emitted tag) — additive → `minor`.
  - Test-only files do not get a bump on their own; the storage test rides the
    `@napplet/nap` bump.
- **Docs drift** — grep for storage API docs and update where the public surface
  is enumerated: `apps/docs/packages/shim.md`, `apps/docs/packages/sdk.md` (if
  present), `packages/shim/README.md`, `packages/sdk/README.md`. Add the
  `.instance.*` surface where the four storage methods are listed. Keep edits
  minimal and accurate; do not invent shell behavior.
- **AI-slop gate** — after edits, re-run the slop gate and restore to passing
  (target 100/100). New per-rule disables need a documented reason.
- Commit atomically: Task 1 as one commit (`feat(nap): …` referencing #57),
  Task 2 as one commit (`feat(vite-plugin): …` referencing #58),
  changesets+docs may ride their respective task commits or a final
  `chore: changesets + docs` commit. Do NOT commit `.planning/` docs (the
  orchestrator handles that) and do NOT touch `.playwright-mcp/`.

## must_haves
- truths:
  - storage request types carry optional `scope?: 'shared'|'instance'`; results do not.
  - top-level storage calls emit no `scope` (byte-identical to today).
  - `window.napplet.storage.instance.*` exists and sets `scope:'instance'`.
  - vite-plugin emits `["archetype", slug, ...naps]` per declared role.
  - archetype + storage-scope changes never alter the aggregate `x` hash for identical dist bytes.
- artifacts:
  - new `packages/nap/src/storage/shim.test.ts`
  - new archetype test case in `packages/vite-plugin/src/index.test.ts`
  - changesets for core/nap/shim/sdk + vite-plugin
- key_links:
  - packages/nap/src/storage/types.ts
  - packages/nap/src/storage/shim.ts
  - packages/core/src/types/global/nostr-api.ts
  - packages/vite-plugin/src/manifest.ts
