# Phase 161: Ad-hoc Convention Package Contracts - Pattern Map

**Mapped:** 2026-07-23
**Files analyzed:** 57 active source, test, documentation, skill, and release files
**Analogs found:** 57 / 57 (grouped where a family follows one implementation pattern)

## File Classification

| New/Modified File(s) | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/core/src/types/intent.ts`, `index.ts`, `types/global.ts`, `types/global/service-api.ts` | model / barrel / provider typing | request-response | `packages/core/src/types/intent.ts` and `packages/nap/src/intent/types.ts` | exact |
| `packages/core/src/topics.ts` | utility/constants | event-driven | `packages/nap/src/inc/{types,shim}.ts` | data-flow match |
| `packages/core/README.md`, `apps/docs/packages/core.md` | documentation | authoring | `packages/nap/README.md` | role match |
| `packages/nap/src/intent/{types,index,shim,sdk,shim.test}.ts` | model / barrel / service / test | request-response | `packages/nap/src/intent/{types,shim,shim.test}.ts` | exact |
| `packages/nap/src/inc/{types,shim}.ts`, `inc-compat.test.ts`, `boundary-smoke.test.ts` | model / service / test | event-driven | `packages/nap/src/inc/shim.ts` | exact |
| `packages/nap/README.md` | documentation | authoring | `packages/nap/src/intent/index.ts` JSDoc | role match |
| `packages/vite-plugin/src/{types,manifest,index.test}.ts` | config / service / test | transform / file-I/O | `packages/vite-plugin/src/{types,manifest,index.test}.ts` | exact |
| `packages/vite-plugin/README.md` | documentation | authoring | `packages/vite-plugin/src/types.ts` | exact |
| `packages/cli/src/{types,config,manifest-metadata,init-wizard,cli,mod,output}.ts` | model / config / service / controller | transform / file-I/O / request-response | `packages/cli/src/{types,config,manifest-metadata}.ts` | exact |
| `packages/cli/tests/{config_test,init_wizard_test,manifest_test}.ts` | test | transform / file-I/O | same-named current tests | exact |
| `packages/cli/README.md`, `apps/docs/packages/cli.md` | documentation | authoring | `packages/cli/src/config.ts` and `init-wizard.ts` | role match |
| `packages/conformance/src/shell/{reference-shell,reference-shell.test}.ts` | service / test fixture | request-response | `packages/conformance/src/shell/reference-shell.ts` | exact |
| `packages/conformance/src/validators/{envelope,envelope.test,manifest}.ts`, `src/run/{boot,boot.test}.ts`, `src/index.ts` | middleware/validator / test / config | request-response / transform | `packages/conformance/src/validators/envelope.ts` | role match |
| `packages/conformance/README.md`, `packages/conformance-cli/{README.md,src/cli.ts}`, `apps/conformance/{index.html,src/main.ts}` | docs / controller / component | authoring / request-response | `packages/conformance/src/shell/reference-shell.ts` | role match |
| `packages/sdk/{README.md,src/index.ts,src/nap-runtime.ts,src/nap-types.ts}` | barrel / provider typing / documentation | request-response | `packages/nap/src/intent/index.ts` plus core barrel | role match |
| `packages/shim/{README.md,src/index.ts,src/runtime.ts,src/prelude.ts,src/shell.test.ts}` | provider / service / test / documentation | request-response | `packages/nap/src/intent/shim.ts` | role match |
| `README.md`, `packages/{boilerplate,core,nap,sdk,shim}/README.md` | documentation | authoring | package README option sections | exact |
| `apps/docs/guide/{getting-started,build-note-drafts-napplet,build-note-drafts-napplet-from-boilerplate,build-note-drafts-napplet-with-ai-agent-and-skills,concepts,index,nip-5d}.md`, `apps/docs/naps/index.md`, `apps/docs/packages/{cli,core,nap,sdk,shim}.md` | documentation | authoring | `apps/docs/guide/getting-started.md` | exact |
| `packages/skills/skills/{build-napplet,design-napplet,make-napplet}/SKILL.md`, `packages/skills/{README.md,src/index.test.ts}` | skill/documentation / test | authoring | existing package-skill files | exact |
| `skills/` | symlink mirror (verify only) | n/a | `packages/skills/skills/` | exact |
| `.changeset/*.md` (one per package with shipped output) | release config | batch | existing `.changeset/*.md` conventions | role match |

## Pattern Assignments

### `packages/core/src/types/intent.ts` and all intent type re-exports (model, request-response)

**Analogs:** `packages/core/src/types/intent.ts:11-55`, `packages/nap/src/intent/types.ts:50-112`, and the barrels at `packages/core/src/index.ts:88-94` and `packages/nap/src/intent/index.ts:30-51`.

**Imports/re-export pattern:** use explicit `import type` in domain types and an explicit `export type` list in barrels. Remove `IntentContract` from both the source type model and every barrel; do not retain a deprecated alias.

**Core model pattern** (`packages/core/src/types/intent.ts:11-19,28-36,46-55`):
```ts
export interface IntentRequest {
  archetype: string;
  action?: string;
  protocol?: string;
  payload?: unknown;
  handler?: IntentHandlerPreference;
  behavior?: IntentBehavior;
}

export interface IntentCandidate {
  dTag: string;
  title?: string;
  actions: string[];
  protocols: string[];
  contracts: IntentContract[];
  isDefault?: boolean;
}
```

Copy the shape and optionality exactly, replacing only the retired public fields: `protocol` → `convention`, `protocols` → `conventions`, and delete `contracts`/`IntentContract`. Preserve the opaque `payload?: unknown` contract.

**Global-provider JSDoc pattern** (`packages/core/src/types/global/service-api.ts:308-343`): update only the intent-specific descriptions and `opts` JSDoc alongside the type name; keep `invoke`, `open`, `available`, `handlers`, and `onChanged` signatures and request-response behavior unchanged.

### `packages/nap/src/intent/{types,index,shim,sdk,shim.test}.ts` (model/service/test, request-response)

**Analog:** `packages/nap/src/intent/shim.ts:63-151,176-199`; matching tests `packages/nap/src/intent/shim.test.ts:56-99`.

**Request/result correlation pattern:**
```ts
function handleInvokeResult(msg: IntentInvokeResultMessage): void {
  const p = pendingInvoke.get(msg.id);
  if (!p) return;
  pendingInvoke.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.result !== undefined) {
    p.resolve(msg.result);
    return;
  }
  p.reject(new Error(msg.error ?? 'invoke failed'));
}

export function invoke(request: IntentRequest): Promise<IntentResult> {
  const id = crypto.randomUUID();
  return new Promise<IntentResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingInvoke.delete(id)) reject(new Error('intent.invoke timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingInvoke.set(id, { resolve, reject, timeout });
    postToShell({ type: 'intent.invoke', id, request });
  });
}
```

Keep the envelope message types, correlation maps, timeouts, top-level-error rejection, and `open()` sugar. The migration changes the request/result fields and JSDoc only; it must not add runtime convention negotiation or payload parsing.

**Test pattern** (`packages/nap/src/intent/shim.test.ts:56-85`): post the request, inspect the exact envelope, dispatch a matching result by returned `id`, then assert the resolved value. Replace fixtures with opaque `napplet:note/open` values and add absence checks for `contracts`/`protocols` if type-level coverage cannot express them.

### `packages/nap/src/inc/{types,shim}.ts` and INC tests (service/test, event-driven)

**Analog:** `packages/nap/src/inc/shim.ts:19-55,76-123,126-139`; types at `packages/nap/src/inc/types.ts:38-103`.

**Exact topic dispatch pattern:**
```ts
const incTopicHandlers = new Map<string, Array<(payload: unknown, sender: string) => void>>();

export function handleIncEvent(msg: IncEventMessage): void {
  const handlers = incTopicHandlers.get(msg.topic);
  if (handlers) {
    const payload = msg.payload ?? {};
    const sender = msg.sender ?? '';
    for (const handler of handlers) handler(payload, sender);
  }
}
```

Use direct `Map.get(msg.topic)` equality. Update examples/constants to `napplet:note/open`, `napplet:profile/open`, and `napplet:dm/open`; do not split, normalize, wildcard-match, prefix-match, or query-parse topics. Add a negative exact-topic assertion in `inc-compat.test.ts` or `boundary-smoke.test.ts`.

### `packages/vite-plugin/src/{types,manifest,index.test}.ts` (config/service/test, transform and file-I/O)

**Analog:** `packages/vite-plugin/src/types.ts:112-131`, `packages/vite-plugin/src/manifest.ts:176-202`, and test `packages/vite-plugin/src/index.test.ts:302-358`.

**Manifest transform pattern:**
```ts
function buildArchetypeTags(archetypes: Nip5aManifestOptions['archetypes']): string[][] {
  if (!archetypes) return [];
  const tags: string[][] = [];
  for (const entry of archetypes) {
    const slug = (typeof entry === 'string' ? entry : entry.slug).trim();
    if (slug === '') continue;
    if (typeof entry === 'string') continue;
    for (const protocol of entry.naps ?? []) {
      const trimmedProtocol = protocol.trim();
      if (trimmedProtocol !== '') tags.push(['archetype', slug, trimmedProtocol]);
    }
  }
  return tags;
}
```

Replace the option shape with one opaque convention string per typed archetype and produce precisely `['archetype', slug, convention]`. Use local documented-form validation only; reject numbered identifiers and remove `kind:` tokens. Preserve existing aggregate-hash exclusion assertions (`index.test.ts:338-357`) rather than changing hash logic.

### `packages/cli/src/{types,config,manifest-metadata,init-wizard,cli,mod,output}.ts` and Deno tests (config/service/controller/test, transform/file-I/O)

**Analogs:** `packages/cli/src/types.ts:16-29`, `packages/cli/src/config.ts:182-244`, `packages/cli/src/manifest-metadata.ts:67-101`, and `packages/cli/tests/config_test.ts:81-93`.

**Parser/normalizer pattern:**
```ts
export function parseArchetypeContract(value: string): NappletArchetypeContract {
  const separator = value.indexOf(':');
  const slug = separator === -1 ? '' : value.slice(0, separator).trim();
  const protocol = separator === -1 ? '' : value.slice(separator + 1).trim();
  return normalizeArchetypeContract({ slug, protocol }, 'archetype');
}

function normalizeArchetypeContract(value: unknown, field: string): NappletArchetypeContract {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must use slug:protocol (for example note:NAP-4)`);
  }
  // validate fields, then return the normalized object
}
```

Keep the existing single parser/normalizer as the CLI boundary. Rename its model and field to convention; accept the documented opaque convention form, reject legacy `NAP-N` input, and never add semantic parsing. In `manifest-metadata.ts`, retain the read/merge/dedupe and NotFound/SyntaxError handling (`lines 27-64`) but make `isCanonicalArchetypeTag` accept exactly three strings and remove `kind:` validation/emission (`lines 77-100`). Update wizard/prompt/help/output through the parsed model, not duplicate formatting logic.

### `packages/conformance/src/shell/{reference-shell,reference-shell.test}.ts` and validators (service/test/middleware, request-response)

**Analog:** `packages/conformance/src/shell/reference-shell.ts:208-228`.

**Reference fixture pattern:**
```ts
'intent.available': (e) => ok({
  type: 'intent.available.result',
  id: e.id,
  availability: {
    archetype: e.archetype,
    available: true,
    candidates: [{
      dTag: 'reference-handler',
      actions: ['open'],
      protocols: ['NAP-4'],
      contracts: [{ action: 'open', protocol: 'NAP-4', eventKinds: [1] }],
      isDefault: true,
    }],
    hasDefault: true,
  },
}),
```

Change this fixture to `conventions: ['napplet:note/open']` only; retain `ok()` response construction and the carrier-level envelope validator. `envelope.ts` must remain convention-agnostic—do not validate payload semantics or add a negotiation rule. Pair each fixture change with the current reference-shell test pattern.

### Documentation, README, and skill files (documentation/skill, authoring)

**Analogs:** public JSDoc in `packages/nap/src/intent/types.ts:50-112`, Vite option documentation in `packages/vite-plugin/README.md:166-180`, and CLI examples sourced from `packages/cli/src/config.ts:182-244`.

Update active author-facing prose and examples in lockstep with the public model: use `convention`/`conventions`, demonstrate one three-element archetype tag, and label payload examples as local convention choices. Preserve generic uses of “protocol” for NIP-5D, NAP domains, WebRTC, URLs, package-manager dependencies, and Nostr event kinds. Do not modify changelogs or archived `.planning`; verify `skills/` only because it mirrors `packages/skills/skills` by symlink.

### Changesets (release config, batch)

**Analog:** existing package-scoped `.changeset/*.md` files.

Add a changeset only for each package whose shipped output changes (not apps/docs or tests alone). Treat this as a breaking public contract migration under the repository’s 0.x release policy; planner must identify exact affected package names after implementation partitioning.

## Shared Patterns

### Type-only imports and named public exports

**Sources:** `packages/nap/src/intent/types.ts:26-31`; `packages/core/src/index.ts:88-94`.

```ts
import type { NappletMessage, IntentHandlerPreference, IntentBehavior } from '@napplet/core';

export type { IntentHandlerPreference, IntentBehavior, IntentRequest, IntentCandidate };
```

Apply to core, NAP, SDK, and shim type propagation. Maintain ESM `.js` relative imports and `import type` separation.

### Request-result error handling

**Source:** `packages/nap/src/intent/shim.ts:63-96,137-151`.

Only reject on missing top-level results/errors and timeouts; resolved `IntentResult` values may carry `ok: false` or `handled: false`. No exception-based validation behavior should be introduced for remote opaque payloads.

### Boundary validation with no invented semantics

**Sources:** `packages/cli/src/config.ts:229-244`; `packages/cli/src/manifest-metadata.ts:88-101`.

Validate documented slug/convention syntax at CLI/Vite/manifest boundaries, normalize only whitespace, and transport the convention unchanged. Do not retain `NAP-N`, `kind:`, version negotiation, wildcard, prefix, or query behavior.

### Exact event-topic routing

**Source:** `packages/nap/src/inc/shim.ts:126-139`.

Topic identity is the raw string map key. This applies to constants, examples, and negative tests in core/NAP packages.

### Documentation scope guard

**Source:** Phase inventory in `161-RESEARCH.md` and active scan pattern.

Create a focused regression scan/test that excludes `CHANGELOG.md` and `.planning/**`; permit unrelated `protocol` and `kind` uses listed in research. It should detect only retired contract vocabulary in active author-facing surfaces.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Focused active-surface regression scan (new test location to choose) | test | batch/static scan | No dedicated repository-wide retired-contract scan exists; follow package test conventions and scope it to active files. |

## Metadata

**Analog search scope:** `packages/{core,nap,vite-plugin,cli,conformance,conformance-cli,sdk,shim,skills,boilerplate}`, `apps/{docs,conformance}`, root documentation, phase inputs; historical paths excluded.
**Files scanned:** 60+ relevant source/test/doc files via active-contract token search.
**Pattern extraction date:** 2026-07-23
