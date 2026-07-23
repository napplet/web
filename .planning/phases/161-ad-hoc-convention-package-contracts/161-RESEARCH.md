# Phase 161: Ad-hoc Convention Package Contracts - Research

**Researched:** 2026-07-23  
**Domain:** NAP-INTENT contract migration, NAP-INC convention-URI transposition, NIP-5A archetype metadata, package and authoring-surface alignment
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Contract migration
- This is a clean break: remove `protocol`, `protocols`, numbered-NAP validation,
  and runtime protocol-negotiation guidance rather than adding compatibility aliases.
- NAP-INTENT exposes only `convention` and `conventions`; remove the non-spec
  public `IntentContract`/`contracts` surface.
- Archetype metadata carries opaque convention strings. Tooling may validate the
  documented `napplet:<archetype>/<intent>` shape but must not parse payload
  semantics or invent version negotiation.

### INC conventions
- Migrate standard examples and constants to the `napplet:<archetype>/<intent>`
  namespace.
- Per D-01, implement only the NAP-INC `emit` convention-URI transposition
  specified by draft PR #89 at exact head
  `34ec29fc4039384a83dbd6b476f83c4fa0d038e6`; keep subscription and shell
  routing exact-string only.
- Keep NAP-INTENT and NIP-5A convention strings opaque. NAP-INC query sugar does
  not authorize parsing in intent discovery/invocation or manifest tooling.

### History and coverage
- Preserve changelog and archived-planning references that describe released
  history or old project requirement IDs.
- Update every active author-facing source, fixture, CLI prompt, package README,
  documentation page, and skill that teaches numbered protocols.

### the agent's Discretion
- Exact internal helper names and task partitioning, provided the public and wire
  contracts match the cited upstream commit and the full repository gates pass.

### Deferred Ideas (OUT OF SCOPE)

Concrete convention payload semantics remain absent upstream. PR #89 defines a
generic shallow text map only; do not recreate the removed NAP-1..5 schemas.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONV-PKG-01 | Migrate core and `@napplet/nap/intent` to the current NAP-INTENT public fields. | Canonical schema and exact source/test inventory below. |
| CONV-PKG-02 | Migrate Vite archetype metadata to opaque convention tags. | `ARCHETYPES.md`, `CONVENTION-TEMPLATE.md`, plugin inventory, and validation rules below. |
| CONV-PKG-03 | Migrate CLI metadata, parsing, prompts, and deploy emission. | CLI type/parser/emitter and Deno-test inventory below. |
| CONV-PKG-04 | Align INC examples/constants and implement the canonical convention-URI `emit` transposition without changing exact routing. | PR #89 exact-head rules, legacy API inventory, and negative tests below. |
| CONV-PKG-05 | Align conformance, author documentation, and skills while preserving history. | Reference-shell, docs/skills, and active-vs-history inventory below. |
| CONV-PKG-06 | Release and verify the package-contract change. | Changeset and complete validation architecture below. |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- The living NIP-5D, NAPs track, and NIP-5A documents are authoritative; repository code, tests, and planning cannot override them. [VERIFIED: AGENTS.md]
- Do not add a message, manifest field, capability, transport/security rule, or build/conformance hard error without a canonical citation; a specification gap must be flagged rather than locally invented. [VERIFIED: AGENTS.md]
- Retire implementation, checks, docs, and comments that depend on deferred or removed protocol surface; do not propagate a defect from a sibling or reference project. [VERIFIED: AGENTS.md]
- Preserve intended public package surface where it agrees with upstream; a missing implementation/export is not automatically a documentation error. [VERIFIED: AGENTS.md]
- Use strict ESM TypeScript, named exports, explicit `import type`, 2-space indentation, semicolons, and JSDoc on public APIs. [VERIFIED: AGENTS.md]
- Keep code, tests, docs, changesets, and the AI-slop gate together; production changes require the repository build, type-check, unit tests, docs/link checks, and appropriate release steps. [VERIFIED: AGENTS.md]
- The repository is currently dirty with Phase 161 planning artifacts plus unrelated `packages/cli/dist-bin/` and `workshop/` work; implementation must stage explicit paths only and leave unrelated work untouched. [VERIFIED: git status 2026-07-23]

## Summary

Upstream commit [`6461e4b`](https://github.com/napplet/naps/tree/6461e4b37c29dc09a20dff35d9515889c4433874) removes the numbered cross-napplet protocol track. NAPs remain runtime-provided domain APIs; NAATs remain role names; cross-napplet payload semantics become unnumbered conventions. The package migration is therefore a clean public-contract rename: `IntentRequest.convention?`, `IntentCandidate.conventions`, and `IntentResult.convention?`, with no `IntentContract`, `contracts`, `protocol`, or `protocols` compatibility surface. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INTENT.md`; VERIFIED: napplet/naps@6461e4b `README.md`]

Draft PR #89 resolves the earlier NAP-INC example ambiguity at exact head
`34ec29fc4039384a83dbd6b476f83c4fa0d038e6`. The developer may call
`emit("napplet:profile/open?pubkey=abc123")`; before routing, the runtime strips
the query into a shallow text payload and sends stable topic
`napplet:profile/open`. This is preprocessing in `emit`, not a shell matcher:
subscriptions and delivered topics still use exact complete-string equality.
The same draft requires literal `+`, percent decoding, and fail-before-emission
handling for fragments, malformed escapes, duplicate decoded names, and a query
combined with explicit payload. [VERIFIED:
`/tmp/napplet-naps-pr89.patch`; CITED:
https://github.com/napplet/naps/blob/34ec29fc4039384a83dbd6b476f83c4fa0d038e6/naps/NAP-INC.md]

**Primary recommendation:** Preserve the completed numbered-contract migration,
then add a clean-break NAP-INC API change from legacy
`emit(topic, extraTags?, content?)` to `emit(topic, payload?)` across
`@napplet/core`, `@napplet/nap`, and `@napplet/sdk`. Test transposition and every
specified rejection through the real `postMessage` boundary; follow it with
README/skill/guard corrections and release metadata before the final phase gate.
[VERIFIED: Phase 161 CONTEXT.md D-01; VERIFIED: napplet/naps PR #89 head
`34ec29f`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Intent type and API contract | Package API (`@napplet/core`, `@napplet/nap/intent`) | Runtime/shim | The packages expose typed request/result and SDK/shim forwarding; they do not own cross-napplet payload schemas. [VERIFIED: `packages/core/src/types/intent.ts`; VERIFIED: `packages/nap/src/intent/*.ts`] |
| Archetype manifest metadata | Build/CLI tooling | Storage (signed NIP-5A manifest) | Vite and CLI serialize the role plus advertised convention into manifest tags; `path` tags alone feed the aggregate hash. [VERIFIED: `packages/vite-plugin/src/manifest.ts`; VERIFIED: `packages/cli/src/manifest-metadata.ts`] |
| Convention discovery | Runtime/shell catalog | Package API | A shell reports installed handlers through `intent.available()` candidates; callers select a reported convention. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INTENT.md`] |
| INC convention-URI emission and topic delivery | Client runtime/shim | Shell exact router | The client runtime transposes a queried convention URI before emission; the shell matches and copies only the resulting stable topic exactly. [VERIFIED: napplet/naps PR #89 head `34ec29f`; VERIFIED: `packages/nap/src/inc/shim.ts`] |
| Contract conformance | Conformance reference runtime | Test fixtures/CLI/web UI | The reference shell supplies intent availability data and fixtures exercise emitted envelopes. [VERIFIED: `packages/conformance/src/shell/reference-shell.ts`; VERIFIED: `packages/conformance/src/validators/envelope.ts`] |
| Author education | Docs, package READMEs, skills | CLI prompts/examples | These surfaces teach the public configuration and must not preserve retired negotiation guidance. [VERIFIED: Phase 161 CONTEXT.md]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | workspace `5.9.3` | Public type migration and strict compile checks | The monorepo’s package contracts are authored in strict ESM TypeScript. [VERIFIED: AGENTS.md] |
| Vitest | existing workspace tooling | Node-package unit tests | Core, nap, Vite plugin, conformance, shim, and skills already expose `vitest run` unit scripts. [VERIFIED: package manifests] |
| Deno | installed `2.5.6` | CLI source and unit tests | The CLI’s build/type-check/test scripts are Deno tasks. [VERIFIED: `packages/cli/package.json`; VERIFIED: local environment] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|-------------|-------------|
| pnpm / Turborepo | installed pnpm `10.8.0` | Workspace build/type/unit orchestration | Use for phase-wide gates after package-level tests are green. [VERIFIED: package.json; VERIFIED: local environment] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing type/parser/test stack | New convention parsing library | Do not add one: the upstream contract requires opaque convention strings, so a parser would create unneeded and potentially invented semantics. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INTENT.md`; VERIFIED: Phase 161 CONTEXT.md] |

**Installation:** None. This phase needs no new external package. [VERIFIED: repository package inventory]

## Adopted PR #89-#91 Amendment (2026-07-23)

The developer adopted exact heads NAP-INC PR #89
`4593ce9e301ce098fd3dad64206fcd6f144fa7af`, web projection PR #90
`896c32c92deee68dc4d10fc1132b62df20cccb6f`, and NAP-INTENT PR #91
`a718915ddefa2f03a0126579601f59d8bd86f7c4`. The implementation delta is
catalogued in `161-PR89-91-DELTA.md`; where the earlier research conflicts, this
amendment controls.

- Share URI syntax/rejection mechanics between INC emit and intent invoke/open,
  while preserving operation-specific output and exact queryless routing.
- Restore `IntentContract`/candidate `contracts`, add optional unsigned
  `eventKinds`, make normalized request identity required, and use a strict
  accepted/rejected result union.
- Deliver `IntentDelivery` through no-ID `intent.deliver`/`onDelivery`, retaining
  all pre-registration deliveries in an internal FIFO. Do not expose capacity,
  use INC as public transport, or encode window/lifecycle policy.
- Derive sender from an authenticated endpoint; caller payload cannot choose it.
- Evolve Vite/CLI object metadata with `eventKinds?: number[]`; serialize
  same-tag `kind:<number>` fields, preserve template kinds, and add no CLI
  delimiter or flag.
- Upgrade conformance carrier validation and the reference shell rather than
  treating immediate acceptance as target handling.

No package install is required, so the package-legitimacy gate is not triggered.

## PR #89-#91 Multi-Source Coverage Audit

| SOURCE | ID | Feature / requirement | Plan | Status | Notes |
|---|---|---|---|---|---|
| GOAL | — | Align all active surfaces to the three adopted heads | 15-26, 10 | COVERED | Code, tooling, conformance, guidance, guard, and release are mapped. |
| REQ | CONV-PKG-01 | Intent public/runtime/SDK/shim contract | 15-19 | COVERED | URI, result, delivery, FIFO, and carrier independence. |
| REQ | CONV-PKG-02 | Vite per-contract kinds | 20 | COVERED | Queryless same-tag serialization and hash isolation. |
| REQ | CONV-PKG-03 | CLI config/template kinds | 21 | COVERED | No delimiter/flag per D-08. |
| REQ | CONV-PKG-04 | INC normalization and attested sender boundary | 15, 22 | COVERED | Existing exact routing retained. |
| REQ | CONV-PKG-05 | Conformance, docs, skills, guard | 22-26 | COVERED | Historical summaries/changelogs excluded. |
| REQ | CONV-PKG-06 | Correct changesets and full release gate | 10, 26 | COVERED | Plan 10 resumes after gap plans. |
| RESEARCH | — | Shared URI rejection matrix | 15, 17 | COVERED | One internal helper, two adopted operations only. |
| RESEARCH | — | Acceptance, delivery, endpoint provenance | 16, 17, 19, 22 | COVERED | No handling/window/ID/INC coupling. |
| RESEARCH | — | Manifest contract discovery and kinds | 16, 20, 21, 22 | COVERED | One tag maps to one contract. |
| RESEARCH | — | Exhaustive active-surface correction | 23-26 | COVERED | README/docs/tutorial/skills/guard inventory. |
| CONTEXT | D-01 | NAP-INC query transposition | 15 | COVERED | Updated PR #89 head per D-02. |
| CONTEXT | D-02 | Adopt exact heads | 15-26, 10 | COVERED | Each plan cites governing heads/decisions. |
| CONTEXT | D-03 | Shared, narrowly scoped URI normalization | 15, 17 | COVERED | Receive/discovery matching remains exact. |
| CONTEXT | D-04 | Public contract and acceptance semantics | 16-18 | COVERED | Retired result/lifecycle fields removed. |
| CONTEXT | D-05 | Lossless pre-registration FIFO delivery | 17, 19 | COVERED | Internal cardinality only; no INC. |
| CONTEXT | D-06 | Endpoint-attested sender | 16, 17, 22 | COVERED | Caller sender cannot select provenance. |
| CONTEXT | D-07 | IntentContract and optional event kinds | 16, 20-22 | COVERED | No payload inference. |
| CONTEXT | D-08 | Object metadata; no CLI syntax invention | 20, 21, 23-25 | COVERED | Config/template only. |
| CONTEXT | D-09 | Authenticated reference fixture | 22 | COVERED | Acceptance and delivery are separate. |

## Architecture Patterns

### System Architecture Diagram

```text
author config / Vite option
          |
          v
opaque { slug, convention } -----> ["archetype", slug, convention]
          |                                  |
          |                                  v
          |                         signed NIP-5A manifest catalog
          |                                  |
          v                                  v
@napplet/core + @napplet/nap/intent <-- intent.available() candidate.conventions
          |                                  |
          v                                  v
 intent.invoke { archetype, convention?, payload? } --> runtime resolves handler
                                                         |
                                                         v
                                  NAP-INC exact topic routing / local payload validation
```

The manifest tag and candidate list advertise a convention name; they do not define its payload schema, and the shell relays payload opaquely. [VERIFIED: napplet/naps@6461e4b `ARCHETYPES.md`; VERIFIED: napplet/naps@6461e4b `naps/NAP-INTENT.md`]

### Pattern 1: Clean, one-way public type migration

**What:** Replace the named fields at their source type, barrel export, global API JSDoc, shim/SDK forwarding, fixture data, and examples in the same change; do not retain aliases. [VERIFIED: Phase 161 CONTEXT.md]

**When to use:** Every active NAP-INTENT surface, because upstream removed rather than deprecated the numbered protocol model. [VERIFIED: napplet/naps@6461e4b commit message and `naps/NAP-INTENT.md`]

```ts
// Source: https://github.com/napplet/naps/blob/6461e4b37c29dc09a20dff35d9515889c4433874/naps/NAP-INTENT.md
export interface IntentRequest {
  archetype: string;
  action?: string;
  convention?: string;
  payload?: unknown;
}

export interface IntentCandidate {
  dTag: string;
  actions: string[];
  conventions: string[];
}
```

### Pattern 2: Opaque convention emission

**What:** Accept one documented-form convention string and emit `['archetype', slug, convention]`; reject `NAP-N` and remove `kind:<n>` extensions. [VERIFIED: napplet/naps@6461e4b `ARCHETYPES.md`; VERIFIED: Phase 161 CONTEXT.md]

**When to use:** Vite plugin options, CLI `--archetype` values, config normalization, metadata merging, and their tests. [VERIFIED: `packages/vite-plugin/src/types.ts`; VERIFIED: `packages/cli/src/config.ts`; VERIFIED: `packages/cli/src/manifest-metadata.ts`]

### Pattern 3: Transpose before exact routing

**What:** Expose `emit(topic, payload?)`. For a queried
`napplet:<archetype>/<intent>` convention URI, parse raw `name=value` segments,
percent-decode names and values with literal `+` preserved, reject the specified
ambiguous/malformed cases, and emit the queryless stable topic with a shallow
text map. Queryless topics forward the explicit payload unchanged. Keep
`on(topic, callback)` and shell routing exact-string only. [VERIFIED:
napplet/naps PR #89 head `34ec29f`; VERIFIED: Phase 161 CONTEXT.md D-01]

Do not use `URLSearchParams` for this transform because its form-encoding
semantics convert `+` to space, contradicting PR #89. The existing zero-dependency
stack can use raw segment splitting plus `decodeURIComponent`, rejecting
decoded duplicate names before `postToShell`. [VERIFIED: ECMAScript platform
behavior; VERIFIED: PR #89 literal-plus rule]

### Active File Inventory

| Area | Active files to change or verify | Required outcome |
|------|----------------------------------|------------------|
| Core public contract | `packages/core/src/types/intent.ts`, `packages/core/src/index.ts`, `packages/core/src/types/global.ts`, `packages/core/src/types/global/service-api.ts`, `packages/core/src/topics.ts`, `packages/core/README.md`, `apps/docs/packages/core.md` | Replace intent fields/JSDoc and old `napplet:*` standard-topic guidance; remove `IntentContract` barrel export. [VERIFIED: repository source scan] |
| NAP intent and INC | `packages/nap/src/intent/{types,index,shim,sdk,shim.test}.ts`, `packages/nap/src/inc/{types,shim,sdk}.ts`, `packages/nap/src/inc-compat.test.ts`, `packages/nap/src/boundary-smoke.test.ts`, `packages/nap/README.md` | Preserve completed NAP-INTENT migration; clean-break INC emit to topic/payload, transpose convention-URI queries before emission, and preserve exact routing. [VERIFIED: repository source scan; PR #89] |
| Vite manifest producer | `packages/vite-plugin/src/{types,manifest,index.test}.ts`, `packages/vite-plugin/README.md` | Replace `naps`/`contracts` option forms and `kind:` emission with opaque convention input and a three-element archetype tag; prove aggregate hash still excludes archetype tags. [VERIFIED: `packages/vite-plugin/src/types.ts`; VERIFIED: `packages/vite-plugin/src/manifest.ts`; VERIFIED: `packages/vite-plugin/src/index.test.ts`] |
| CLI producer/consumer | `packages/cli/src/{types,config,manifest-metadata,init-wizard,cli,mod,output}.ts`, `packages/cli/tests/{config_test,init_wizard_test,manifest_test}.ts`, `packages/cli/README.md`, `apps/docs/packages/cli.md` | Rename config field/parser/prompt/help/output; reject legacy numbered values; emit and accept only the three-element convention tag. [VERIFIED: `packages/cli/src/config.ts`; VERIFIED: `packages/cli/src/manifest-metadata.ts`] |
| Conformance | `packages/conformance/src/shell/{reference-shell,reference-shell.test}.ts`, `packages/conformance/src/validators/{envelope,envelope.test,manifest}.ts`, `packages/conformance/src/run/{boot,boot.test}.ts`, `packages/conformance/{README.md,src/index.ts}`, `packages/conformance-cli/{README.md,src/cli.ts}`, `apps/conformance/{index.html,src/main.ts}` | Reference availability must expose `conventions` only; keep envelope carrier validation convention-agnostic; verify UI/CLI wording only where it teaches the old model. [VERIFIED: `packages/conformance/src/shell/reference-shell.ts`; VERIFIED: `packages/conformance/src/validators/envelope.ts`] |
| SDK and shim | `packages/sdk/{README.md,src/relay.ts}`, `packages/shim/README.md`, `packages/core/src/types/global/nostr-api.ts` | Replace the legacy three-argument INC emit signature and examples with `emit(topic, payload?)`; do not keep overloads or compatibility interpretation. [VERIFIED: repository source scan] |
| Author docs | `README.md`, `packages/{boilerplate,core,nap,sdk,shim}/README.md`, `apps/docs/guide/{getting-started,build-note-drafts-napplet,build-note-drafts-napplet-from-boilerplate,build-note-drafts-napplet-with-ai-agent-and-skills,concepts,index,nip-5d}.md`, `apps/docs/{naps/index.md,packages/{cli,core,nap,sdk,shim}.md}` | Replace active `slug:NAP-N`, NAP-N examples, and numbered negotiation language; retain generic uses of “protocol” that mean NIP-5D/NAP domain protocol. [VERIFIED: repository source scan] |
| Skills | `packages/skills/skills/{build-napplet,design-napplet,make-napplet}/SKILL.md`, plus `packages/skills/{README.md,src/index.test.ts}` and root `skills/` mirror | Change canonical package skill files once; root `skills` is a symlink to `packages/skills/skills`, so it must be verified rather than independently edited. [VERIFIED: `ls -ld skills`; VERIFIED: repository source scan] |

### Active surfaces deliberately excluded from the migration

- `protocol` fields in WebRTC and URL APIs, workspace `workspace:` dependency protocol, Nostr event `kind`, generic NIP-5D/NAP terminology, and unrelated relay capability wording do not identify the removed numbered convention contract. [VERIFIED: `packages/core/src/types/webrtc.ts`; VERIFIED: `packages/cli/src/output.ts`; VERIFIED: repository source scan]
- Historical `CHANGELOG.md` entries, archived `.planning/**`, and prior milestone records preserve semantic history and are out of scope. [VERIFIED: Phase 161 CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Convention routing/identity inference | Shell query parser, wildcard matcher, prefix matcher, Unicode/case normalizer, NAP-INTENT or manifest parser | PR #89 client-side `emit` transposition followed by exact topic routing | The draft defines one narrow preprocessing rule and explicitly keeps routing exact. [VERIFIED: PR #89 head `34ec29f`; VERIFIED: Phase 161 CONTEXT.md D-01] |
| Query decoding | `URLSearchParams` or form-urlencoded helpers | Raw query segments plus `decodeURIComponent` | Form semantics change `+` to a space, while PR #89 requires literal plus. [VERIFIED: PR #89 head `34ec29f`] |
| Payload schemas for `note`, `profile`, `dm`, `feed`, or `stream` | Revived NAP-1..5 TypeScript contracts | A future upstream convention specification | NAAT roles and convention names do not carry the removed payload schemas. [VERIFIED: napplet/naps@6461e4b `ARCHETYPES.md`; VERIFIED: `CONVENTION-TEMPLATE.md`] |
| Archetype metadata constraints | `kind:<n>` extension/parser | Three-element tag with convention string | The upstream archetype example and template provide role slug plus convention, not custom constraints. [VERIFIED: napplet/naps@6461e4b `ARCHETYPES.md`; VERIFIED: `CONVENTION-TEMPLATE.md`] |

**Key insight:** This phase removes local interpretation, not merely legacy vocabulary; the safe implementation is the smallest surface that transports and advertises convention strings unchanged. [VERIFIED: napplet/naps@6461e4b]

## Common Pitfalls

### Pitfall 1: Treating `convention` as a cosmetic rename
**What goes wrong:** A compatibility `protocol` field, `contracts` array, `eventKinds`, or two-argument negotiation remains in the public API.  
**How to avoid:** Type-check exported barrels and grep active sources for the removed contract vocabulary after the migration. [VERIFIED: Phase 161 CONTEXT.md]

### Pitfall 2: Putting PR #89 transposition in the matcher
**What goes wrong:** The shell or receive-side handler parses query text, making
prefix-like delivery possible and changing delivered topic bytes.
**How to avoid:** Transpose only in runtime `emit`, before `postMessage`; assert
the emitted envelope carries the stable topic and the existing direct
`Map.get(msg.topic)` receive path remains unchanged. [VERIFIED: PR #89 head
`34ec29f`]

### Pitfall 3: Preserving the legacy emit arguments
**What goes wrong:** An overload keeps interpreting `extraTags` and JSON-string
`content`, so array payloads are dropped and string payloads are parsed instead
of remaining opaque.
**How to avoid:** Clean-break every public signature to
`emit(topic, payload?)`, forward queryless payloads byte-for-byte/as-is, and
type-check built declarations across core, NAP, and SDK. [VERIFIED: current
`packages/core/src/types/global/nostr-api.ts`,
`packages/nap/src/inc/{shim,sdk}.ts`, and `packages/sdk/src/relay.ts`]

### Pitfall 4: Moving old payload constraints into a new manifest form
**What goes wrong:** `kind:<n>` survives under a renamed convention property, implicitly preserving removed NAP-N semantics.  
**How to avoid:** Emit exactly `['archetype', slug, convention]` and reject the old input forms in both Vite and CLI tests. [VERIFIED: napplet/naps@6461e4b `ARCHETYPES.md`; VERIFIED: Phase 161 CONTEXT.md]

### Pitfall 5: Editing immutable history or missing live documentation
**What goes wrong:** A broad replacement alters changelogs/archived planning while a CLI prompt or tutorial still teaches `note:NAP-4`.  
**How to avoid:** Use the active inventory above and run two scans: one excluding history must be clean, while historic files remain unchanged. [VERIFIED: Phase 161 CONTEXT.md; VERIFIED: repository source scan]

## Code Examples

### Current NAP-INTENT discovery and dispatch shape

```ts
// Source: https://github.com/napplet/naps/blob/6461e4b37c29dc09a20dff35d9515889c4433874/naps/NAP-INTENT.md
const availability = await window.napplet.intent?.available('note');
const convention = availability?.candidates[0]?.conventions[0];

await window.napplet.intent?.invoke({
  archetype: 'note',
  action: 'open',
  convention,
  payload: localPayload,
});
```

### Current manifest discovery shape

```ts
// Source: https://github.com/napplet/naps/blob/6461e4b37c29dc09a20dff35d9515889c4433874/ARCHETYPES.md
['archetype', 'note', 'napplet:note/open']
```

### Current NAP-INC convention-URI emission shape

```ts
// Source: napplet/naps PR #89 at 34ec29fc4039384a83dbd6b476f83c4fa0d038e6
window.napplet.inc?.emit('napplet:profile/open?pubkey=abc123');
// runtime wire output:
// { type: 'inc.emit', topic: 'napplet:profile/open', payload: { pubkey: 'abc123' } }
```

The `on` call subscribes to `napplet:profile/open`; no receive-side query
matching is introduced.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Numbered NAP payload protocols (`NAP-N`), `protocol`/`protocols`, contract constraints | Unnumbered opaque `napplet:<archetype>/<intent>[...?params]` conventions and `convention`/`conventions` fields | `napplet/naps` commit `6461e4b` | Remove negotiation/constraint helpers and advertise conventions through manifest metadata and `intent.available()`. [VERIFIED: napplet/naps@6461e4b] |
| Legacy INC `emit(topic, extraTags?, content?)` and unresolved query-bearing examples | `emit(topic, payload?)`; queried convention URIs become stable topic plus shallow text payload before exact routing | `napplet/naps` PR #89 head `34ec29f` | Coordinated breaking signature change in core/NAP/SDK plus strict decoder/rejection coverage and documentation correction. [VERIFIED: PR #89 patch] |

**Deprecated/outdated:** `NAP-N-TEMPLATE.md`, NAP-1..5 payload assumptions, `kind:<n>` archetype extensions, and `IntentContract` are not current contracts for this phase. [VERIFIED: napplet/naps@6461e4b commit diff; VERIFIED: Phase 161 CONTEXT.md]

## Assumptions Log

All findings are verified against the supplied authoritative upstream checkout or the live repository; no planner decision requires an assumed claim.

## Resolved Upstream Clarification

1. **Are query parameters part of convention identity or payload?**
   - Resolved by PR #89 at `34ec29f`: for NAP-INC `emit`, a convention URI's
     query is shallow payload sugar and its path is the routed topic.
   - Boundary: this does not change NAP-INTENT convention identity, NIP-5A
     manifest encoding, or exact topic matching.

## Open Questions

1. **How are multiple conventions encoded for a role tag?**
   - What we know: Upstream shows a three-element tag and says accepted convention(s), but does not prescribe repeated tags versus a multi-value tag. [VERIFIED: napplet/naps@6461e4b `ARCHETYPES.md`]
   - What's unclear: The precise multi-convention manifest representation.
   - Recommendation: Keep this phase to the documented one-convention-per-tag representation and raise any multi-value design as an upstream clarification instead of inventing a local aggregate form. [VERIFIED: Phase 161 CONTEXT.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Workspace build, docs/link checks, conformance CLI | ✓ | v25.2.1 | — [VERIFIED: local environment] |
| pnpm | Workspace orchestration | ✓ | 10.8.0 | — [VERIFIED: local environment] |
| Deno | CLI build/type/unit tests | ✓ | 2.5.6 | — [VERIFIED: local environment] |
| Git | active-vs-history scan and diff validation | ✓ | 2.50.1 | — [VERIFIED: local environment] |

**Missing dependencies with no fallback:** None. [VERIFIED: local environment]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest for TypeScript packages; Deno test for `@napplet/cli`. [VERIFIED: package manifests] |
| Config file | Package-local Vitest configs where required; CLI uses `deno task test:unit`. [VERIFIED: package manifests] |
| Quick run command | `pnpm --filter @napplet/core test:unit && pnpm --filter @napplet/nap test:unit && pnpm --filter @napplet/vite-plugin test:unit && pnpm --filter @napplet/conformance test:unit && pnpm --filter @napplet/cli test:unit` |
| Full suite command | `pnpm type-check && pnpm build && pnpm -r test:unit && pnpm test:conformance && pnpm check:links && git diff --check` [VERIFIED: root package.json] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONV-PKG-01 | Only convention/conventions fields are encoded and exported; no contracts remain. | unit + type-check | `pnpm --filter @napplet/core test:unit && pnpm --filter @napplet/nap test:unit` | ✅ extend `packages/nap/src/intent/shim.test.ts`; add/extend core export assertions |
| CONV-PKG-02 | Vite produces only `['archetype', slug, convention]`, rejects NAP-N, and preserves aggregate hashing rules. | unit | `pnpm --filter @napplet/vite-plugin test:unit` | ✅ extend `packages/vite-plugin/src/index.test.ts` |
| CONV-PKG-03 | CLI parses/normalizes conventions, rejects numbered inputs, and emits canonical tags. | unit | `pnpm --filter @napplet/cli test:unit` | ✅ extend `packages/cli/tests/{config_test,init_wizard_test,manifest_test}.ts` |
| CONV-PKG-04 | INC exposes `emit(topic, payload?)`, transposes convention-URI queries before `postMessage`, rejects every specified invalid form, and preserves exact receive routing. | unit + type-check + static scan | `pnpm --filter @napplet/nap test:unit && pnpm --filter @napplet/core type-check && pnpm --filter @napplet/sdk type-check` | ✅ extend `packages/nap/src/inc-compat.test.ts`; ✅ existing exact-routing cases remain |
| CONV-PKG-05 | Reference shell returns candidate conventions and active docs/skills have no numbered guidance. | unit + static scan | `pnpm --filter @napplet/conformance test:unit` | ✅ extend `reference-shell.test.ts`; ❌ add active-surface grep guard |
| CONV-PKG-06 | Packages compile, ship metadata is complete, and full gates pass. | integration/release | full suite command above | ✅ infrastructure; ❌ changesets per changed package |

### Sampling Rate

- **Per task commit:** the relevant package unit command plus `pnpm --filter <package> type-check`. [VERIFIED: package manifests]
- **Per wave merge:** `pnpm type-check && pnpm build && pnpm -r test:unit`. [VERIFIED: root package.json]
- **Phase gate:** full suite command, docs build/link check, AI-slop gate, `git diff --check`, and active-surface scan before release work. [VERIFIED: AGENTS.md; VERIFIED: root package.json]

### Wave 0 Gaps

- [ ] Add a focused active-surface regression scan that excludes `CHANGELOG.md` and archived `.planning/**`, catches `IntentContract`, `contracts`, `protocols`, `slug:NAP-N`, `kind:<n>`, and numbered convention guidance, and explicitly permits unrelated WebRTC/URL/dependency uses of “protocol”. [VERIFIED: Phase 161 CONTEXT.md]
- [ ] Add negative tests that Vite and CLI reject numbered NAP identifiers and do not emit `kind:` metadata. [VERIFIED: Phase 161 ROADMAP success criterion 2]
- [ ] Add fail-first `emit` envelope cases for stable-topic transposition,
  percent-decoded text maps, literal plus, decoded duplicate names, fragments,
  malformed percent escapes, explicit payload conflict, and queryless opaque
  payload forwarding. Retain the existing receive-side exact-topic assertions.
  [VERIFIED: PR #89 head `34ec29f`]
- [ ] Update the active-surface guard so the obsolete blanket prohibition on
  convention-URI queries cannot return in shipped skills/README guidance, while
  NAP-INTENT and manifest surfaces remain opaque. [VERIFIED: Phase 161 D-01]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No authentication flow changes. [VERIFIED: phase scope] |
| V3 Session Management | no | No session flow changes. [VERIFIED: phase scope] |
| V4 Access Control | yes | Preserve shell-side archetype resolution and no direct napplet addressing; do not add convention negotiation bypasses. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INTENT.md`] |
| V5 Input Validation | yes | Validate only documented slug/convention shape at manifest/CLI boundaries; receiving napplets validate opaque payloads against a real convention. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INTENT.md`; VERIFIED: Phase 161 CONTEXT.md] |
| V6 Cryptography | no | No cryptographic implementation is in scope. [VERIFIED: phase scope] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A caller uses a convention to coerce a handler or payload interpretation | Tampering / Elevation | Shell resolves only catalog/default/user-authorized handlers; receiver treats payload as untrusted and validates it. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INTENT.md`] |
| Query transposition changes routing or silently overwrites a duplicate key | Tampering | Parse only in client `emit`, reject repeated decoded names before emission, and preserve exact shell/receive routing. [VERIFIED: PR #89 head `34ec29f`] |
| Form-style decoding changes literal plus to space | Tampering | Avoid `URLSearchParams`; test literal `+` and percent-decoded `%2B` explicitly. [VERIFIED: PR #89 head `34ec29f`] |
| Manifest constraints falsely claim a payload contract | Spoofing | Emit only documented convention metadata and no `kind:` extension. [VERIFIED: napplet/naps@6461e4b `ARCHETYPES.md`; VERIFIED: Phase 161 CONTEXT.md] |

## Sources

### Primary (HIGH confidence)
- [napplet/naps commit 6461e4b](https://github.com/napplet/naps/tree/6461e4b37c29dc09a20dff35d9515889c4433874) — authoritative removal commit and repository state.
- [NAP-INTENT](https://github.com/napplet/naps/blob/6461e4b37c29dc09a20dff35d9515889c4433874/naps/NAP-INTENT.md) — current fields, discovery, dispatch, payload, and security contracts.
- [NAP-INC draft PR #89 exact head](https://github.com/napplet/naps/blob/34ec29fc4039384a83dbd6b476f83c4fa0d038e6/naps/NAP-INC.md) — convention-URI query transposition, strict rejection cases, exact routing boundary, sender identity, and payload responsibility.
- [ARCHETYPES](https://github.com/napplet/naps/blob/6461e4b37c29dc09a20dff35d9515889c4433874/ARCHETYPES.md) and [Convention template](https://github.com/napplet/naps/blob/6461e4b37c29dc09a20dff35d9515889c4433874/CONVENTION-TEMPLATE.md) — manifest tag and convention-discovery examples.
- `AGENTS.md`, Phase 161 `CONTEXT.md`, `ROADMAP.md`, and current source/test scan — project constraints and active-surface inventory. [VERIFIED: local repository]

### Secondary (MEDIUM confidence)
- Kehto `101-UPSTREAM-DELTA.md` — non-normative audit; its stated migration and ambiguity were cross-checked against the pinned upstream files. [VERIFIED: local audit cross-check]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools and scripts were inspected locally. [VERIFIED: package manifests; local environment]
- Architecture: HIGH — NAP-INTENT/manifest conclusions come from `6461e4b`,
  and NAP-INC transposition conclusions come from the supplied PR #89 patch at
  exact head `34ec29f`. [VERIFIED: canonical sources]
- Pitfalls: HIGH — each follows an explicit upstream rule or locked Phase 161
  D-01. [VERIFIED: napplet/naps@6461e4b; PR #89 head `34ec29f`; Phase 161
  CONTEXT.md]

**Research date:** 2026-07-23  
**Valid until:** The upstream NAP track is living; re-check its head and the cited commit before implementation if planning is delayed beyond 7 days. [VERIFIED: AGENTS.md]
