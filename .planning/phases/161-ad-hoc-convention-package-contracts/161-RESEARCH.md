# Phase 161: Ad-hoc Convention Package Contracts - Research

**Researched:** 2026-07-23  
**Domain:** NAP-INTENT/INC contract migration, NIP-5A archetype metadata, package and authoring-surface alignment  
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
- Keep payload examples as explicitly local convention choices. Do not implement
  wildcard, prefix, or query normalization: upstream does not define it.

### History and coverage
- Preserve changelog and archived-planning references that describe released
  history or old project requirement IDs.
- Update every active author-facing source, fixture, CLI prompt, package README,
  documentation page, and skill that teaches numbered protocols.

### the agent's Discretion
- Exact internal helper names and task partitioning, provided the public and wire
  contracts match the cited upstream commit and the full repository gates pass.

### Deferred Ideas (OUT OF SCOPE)

Concrete convention payload specifications are absent upstream. Do not recreate
the removed NAP-1..5 schemas locally; that requires new upstream convention specs.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONV-PKG-01 | Migrate core and `@napplet/nap/intent` to the current NAP-INTENT public fields. | Canonical schema and exact source/test inventory below. |
| CONV-PKG-02 | Migrate Vite archetype metadata to opaque convention tags. | `ARCHETYPES.md`, `CONVENTION-TEMPLATE.md`, plugin inventory, and validation rules below. |
| CONV-PKG-03 | Migrate CLI metadata, parsing, prompts, and deploy emission. | CLI type/parser/emitter and Deno-test inventory below. |
| CONV-PKG-04 | Align INC examples/constants without inventing routing semantics. | NAP-INC routing ambiguity, core/INC inventory, and negative tests below. |
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

The one deliberately unresolved upstream edge determines the implementation boundary: NAP-INC shows a subscription to `napplet:profile/open` and an emitted topic with query text, but specifies only matching-topic routing and says routing is not prefix parsing. It does not define wildcard matching, prefix matching, or query normalization. Plan exact-string routing and keep query-bearing topic examples out of implementation contracts; a planner must not turn this apparent example mismatch into new behavior. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INC.md`; CITED: https://github.com/napplet/naps/blob/6461e4b37c29dc09a20dff35d9515889c4433874/naps/NAP-INC.md]

**Primary recommendation:** Make this one coordinated breaking migration, beginning with core/intent public types and manifest producers, then reference fixtures and authoring surfaces; test exact opaque convention preservation and explicit rejection of the removed numbered inputs. [VERIFIED: Phase 161 CONTEXT.md; VERIFIED: napplet/naps@6461e4b]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Intent type and API contract | Package API (`@napplet/core`, `@napplet/nap/intent`) | Runtime/shim | The packages expose typed request/result and SDK/shim forwarding; they do not own cross-napplet payload schemas. [VERIFIED: `packages/core/src/types/intent.ts`; VERIFIED: `packages/nap/src/intent/*.ts`] |
| Archetype manifest metadata | Build/CLI tooling | Storage (signed NIP-5A manifest) | Vite and CLI serialize the role plus advertised convention into manifest tags; `path` tags alone feed the aggregate hash. [VERIFIED: `packages/vite-plugin/src/manifest.ts`; VERIFIED: `packages/cli/src/manifest-metadata.ts`] |
| Convention discovery | Runtime/shell catalog | Package API | A shell reports installed handlers through `intent.available()` candidates; callers select a reported convention. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INTENT.md`] |
| INC topic delivery | Runtime/shell | Client shim | The runtime matches and delivers topics with a sender dTag; shims expose the API but must not reinterpret topic strings. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INC.md`; VERIFIED: `packages/nap/src/inc/shim.ts`] |
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

### Pattern 3: Exact topic strings, local payload choice

**What:** Replace the old `napplet:*` standard-topic examples/constants with `napplet:<archetype>/<intent>` examples, while documenting any payload as a local convention choice. Do not add a matcher or a query parser. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INC.md`; VERIFIED: Phase 161 CONTEXT.md]

### Active File Inventory

| Area | Active files to change or verify | Required outcome |
|------|----------------------------------|------------------|
| Core public contract | `packages/core/src/types/intent.ts`, `packages/core/src/index.ts`, `packages/core/src/types/global.ts`, `packages/core/src/types/global/service-api.ts`, `packages/core/src/topics.ts`, `packages/core/README.md`, `apps/docs/packages/core.md` | Replace intent fields/JSDoc and old `napplet:*` standard-topic guidance; remove `IntentContract` barrel export. [VERIFIED: repository source scan] |
| NAP intent and INC | `packages/nap/src/intent/{types,index,shim,sdk,shim.test}.ts`, `packages/nap/src/inc/{types,shim}.ts`, `packages/nap/src/inc-compat.test.ts`, `packages/nap/src/boundary-smoke.test.ts`, `packages/nap/README.md` | Rename active NAP-INTENT types/fixtures/docs; make INC examples directional only where upstream says so and preserve exact routing. [VERIFIED: repository source scan] |
| Vite manifest producer | `packages/vite-plugin/src/{types,manifest,index.test}.ts`, `packages/vite-plugin/README.md` | Replace `naps`/`contracts` option forms and `kind:` emission with opaque convention input and a three-element archetype tag; prove aggregate hash still excludes archetype tags. [VERIFIED: `packages/vite-plugin/src/types.ts`; VERIFIED: `packages/vite-plugin/src/manifest.ts`; VERIFIED: `packages/vite-plugin/src/index.test.ts`] |
| CLI producer/consumer | `packages/cli/src/{types,config,manifest-metadata,init-wizard,cli,mod,output}.ts`, `packages/cli/tests/{config_test,init_wizard_test,manifest_test}.ts`, `packages/cli/README.md`, `apps/docs/packages/cli.md` | Rename config field/parser/prompt/help/output; reject legacy numbered values; emit and accept only the three-element convention tag. [VERIFIED: `packages/cli/src/config.ts`; VERIFIED: `packages/cli/src/manifest-metadata.ts`] |
| Conformance | `packages/conformance/src/shell/{reference-shell,reference-shell.test}.ts`, `packages/conformance/src/validators/{envelope,envelope.test,manifest}.ts`, `packages/conformance/src/run/{boot,boot.test}.ts`, `packages/conformance/{README.md,src/index.ts}`, `packages/conformance-cli/{README.md,src/cli.ts}`, `apps/conformance/{index.html,src/main.ts}` | Reference availability must expose `conventions` only; keep envelope carrier validation convention-agnostic; verify UI/CLI wording only where it teaches the old model. [VERIFIED: `packages/conformance/src/shell/reference-shell.ts`; VERIFIED: `packages/conformance/src/validators/envelope.ts`] |
| SDK and shim | `packages/sdk/{README.md,src/index.ts,src/nap-runtime.ts,src/nap-types.ts}`, `packages/shim/{README.md,src/index.ts,src/runtime.ts,src/prelude.ts,src/shell.test.ts}` | Audit imports/JSDoc/examples and add no transport or negotiation behavior; current grep finds no numbered NAP contract in these runtime source files. [VERIFIED: repository source scan] |
| Author docs | `README.md`, `packages/{boilerplate,core,nap,sdk,shim}/README.md`, `apps/docs/guide/{getting-started,build-note-drafts-napplet,build-note-drafts-napplet-from-boilerplate,build-note-drafts-napplet-with-ai-agent-and-skills,concepts,index,nip-5d}.md`, `apps/docs/{naps/index.md,packages/{cli,core,nap,sdk,shim}.md}` | Replace active `slug:NAP-N`, NAP-N examples, and numbered negotiation language; retain generic uses of “protocol” that mean NIP-5D/NAP domain protocol. [VERIFIED: repository source scan] |
| Skills | `packages/skills/skills/{build-napplet,design-napplet,make-napplet}/SKILL.md`, plus `packages/skills/{README.md,src/index.test.ts}` and root `skills/` mirror | Change canonical package skill files once; root `skills` is a symlink to `packages/skills/skills`, so it must be verified rather than independently edited. [VERIFIED: `ls -ld skills`; VERIFIED: repository source scan] |

### Active surfaces deliberately excluded from the migration

- `protocol` fields in WebRTC and URL APIs, workspace `workspace:` dependency protocol, Nostr event `kind`, generic NIP-5D/NAP terminology, and unrelated relay capability wording do not identify the removed numbered convention contract. [VERIFIED: `packages/core/src/types/webrtc.ts`; VERIFIED: `packages/cli/src/output.ts`; VERIFIED: repository source scan]
- Historical `CHANGELOG.md` entries, archived `.planning/**`, and prior milestone records preserve semantic history and are out of scope. [VERIFIED: Phase 161 CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Convention version/compatibility negotiation | URI/query parser, wildcard matcher, normalization rules, compatibility alias layer | Opaque string fields plus exact topic routing | Upstream does not define those semantics; creating them would add protocol surface. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INC.md`; VERIFIED: Phase 161 CONTEXT.md] |
| Payload schemas for `note`, `profile`, `dm`, `feed`, or `stream` | Revived NAP-1..5 TypeScript contracts | A future upstream convention specification | NAAT roles and convention names do not carry the removed payload schemas. [VERIFIED: napplet/naps@6461e4b `ARCHETYPES.md`; VERIFIED: `CONVENTION-TEMPLATE.md`] |
| Archetype metadata constraints | `kind:<n>` extension/parser | Three-element tag with convention string | The upstream archetype example and template provide role slug plus convention, not custom constraints. [VERIFIED: napplet/naps@6461e4b `ARCHETYPES.md`; VERIFIED: `CONVENTION-TEMPLATE.md`] |

**Key insight:** This phase removes local interpretation, not merely legacy vocabulary; the safe implementation is the smallest surface that transports and advertises convention strings unchanged. [VERIFIED: napplet/naps@6461e4b]

## Common Pitfalls

### Pitfall 1: Treating `convention` as a cosmetic rename
**What goes wrong:** A compatibility `protocol` field, `contracts` array, `eventKinds`, or two-argument negotiation remains in the public API.  
**How to avoid:** Type-check exported barrels and grep active sources for the removed contract vocabulary after the migration. [VERIFIED: Phase 161 CONTEXT.md]

### Pitfall 2: Inventing query or wildcard behavior from the INC example
**What goes wrong:** A base-topic subscription is made to match a query-bearing emit by prefix or normalization.  
**How to avoid:** Preserve exact string routing; test that no matcher/parser is introduced and describe query-bearing payload choices as local only. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INC.md`]

### Pitfall 3: Moving old payload constraints into a new manifest form
**What goes wrong:** `kind:<n>` survives under a renamed convention property, implicitly preserving removed NAP-N semantics.  
**How to avoid:** Emit exactly `['archetype', slug, convention]` and reject the old input forms in both Vite and CLI tests. [VERIFIED: napplet/naps@6461e4b `ARCHETYPES.md`; VERIFIED: Phase 161 CONTEXT.md]

### Pitfall 4: Editing immutable history or missing live documentation
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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Numbered NAP payload protocols (`NAP-N`), `protocol`/`protocols`, contract constraints | Unnumbered opaque `napplet:<archetype>/<intent>[...?params]` conventions and `convention`/`conventions` fields | `napplet/naps` commit `6461e4b` | Remove negotiation/constraint helpers and advertise conventions through manifest metadata and `intent.available()`. [VERIFIED: napplet/naps@6461e4b] |

**Deprecated/outdated:** `NAP-N-TEMPLATE.md`, NAP-1..5 payload assumptions, `kind:<n>` archetype extensions, and `IntentContract` are not current contracts for this phase. [VERIFIED: napplet/naps@6461e4b commit diff; VERIFIED: Phase 161 CONTEXT.md]

## Assumptions Log

All findings are verified against the supplied authoritative upstream checkout or the live repository; no planner decision requires an assumed claim.

## Open Questions

1. **Are query parameters part of convention identity or payload?**
   - What we know: The upstream template permits `...?params`, while NAP-INC only defines matching-topic routing and not normalization. [VERIFIED: napplet/naps@6461e4b `CONVENTION-TEMPLATE.md`; VERIFIED: `naps/NAP-INC.md`]
   - What's unclear: Whether a base-topic subscription should receive a query-bearing topic.
   - Recommendation: Do not decide it in this phase; retain exact opaque topic strings and flag any desired behavior for an upstream convention/NAP clarification. [VERIFIED: Phase 161 CONTEXT.md]

2. **How are multiple conventions encoded for a role tag?**
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
| CONV-PKG-04 | INC examples/constants use the namespace and runtime does not gain normalization. | unit + static scan | `pnpm --filter @napplet/nap test:unit` | ✅ extend INC compatibility/boundary tests; ❌ add an explicit no-normalization assertion if absent |
| CONV-PKG-05 | Reference shell returns candidate conventions and active docs/skills have no numbered guidance. | unit + static scan | `pnpm --filter @napplet/conformance test:unit` | ✅ extend `reference-shell.test.ts`; ❌ add active-surface grep guard |
| CONV-PKG-06 | Packages compile, ship metadata is complete, and full gates pass. | integration/release | full suite command above | ✅ infrastructure; ❌ changesets per changed package |

### Sampling Rate

- **Per task commit:** the relevant package unit command plus `pnpm --filter <package> type-check`. [VERIFIED: package manifests]
- **Per wave merge:** `pnpm type-check && pnpm build && pnpm -r test:unit`. [VERIFIED: root package.json]
- **Phase gate:** full suite command, docs build/link check, AI-slop gate, `git diff --check`, and active-surface scan before release work. [VERIFIED: AGENTS.md; VERIFIED: root package.json]

### Wave 0 Gaps

- [ ] Add a focused active-surface regression scan that excludes `CHANGELOG.md` and archived `.planning/**`, catches `IntentContract`, `contracts`, `protocols`, `slug:NAP-N`, `kind:<n>`, and numbered convention guidance, and explicitly permits unrelated WebRTC/URL/dependency uses of “protocol”. [VERIFIED: Phase 161 CONTEXT.md]
- [ ] Add negative tests that Vite and CLI reject numbered NAP identifiers and do not emit `kind:` metadata. [VERIFIED: Phase 161 ROADMAP success criterion 2]
- [ ] Add an exact-topic assertion proving no query/prefix/wildcard normalization was introduced. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INC.md`]

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
| Local routing parser changes query/prefix semantics | Tampering | Exact opaque topic matching; no normalization until an upstream rule exists. [VERIFIED: napplet/naps@6461e4b `naps/NAP-INC.md`] |
| Manifest constraints falsely claim a payload contract | Spoofing | Emit only documented convention metadata and no `kind:` extension. [VERIFIED: napplet/naps@6461e4b `ARCHETYPES.md`; VERIFIED: Phase 161 CONTEXT.md] |

## Sources

### Primary (HIGH confidence)
- [napplet/naps commit 6461e4b](https://github.com/napplet/naps/tree/6461e4b37c29dc09a20dff35d9515889c4433874) — authoritative removal commit and repository state.
- [NAP-INTENT](https://github.com/napplet/naps/blob/6461e4b37c29dc09a20dff35d9515889c4433874/naps/NAP-INTENT.md) — current fields, discovery, dispatch, payload, and security contracts.
- [NAP-INC](https://github.com/napplet/naps/blob/6461e4b37c29dc09a20dff35d9515889c4433874/naps/NAP-INC.md) — topic names, exact routing boundary, sender identity, and payload responsibility.
- [ARCHETYPES](https://github.com/napplet/naps/blob/6461e4b37c29dc09a20dff35d9515889c4433874/ARCHETYPES.md) and [Convention template](https://github.com/napplet/naps/blob/6461e4b37c29dc09a20dff35d9515889c4433874/CONVENTION-TEMPLATE.md) — manifest tag and convention-discovery examples.
- `AGENTS.md`, Phase 161 `CONTEXT.md`, `ROADMAP.md`, and current source/test scan — project constraints and active-surface inventory. [VERIFIED: local repository]

### Secondary (MEDIUM confidence)
- Kehto `101-UPSTREAM-DELTA.md` — non-normative audit; its stated migration and ambiguity were cross-checked against the pinned upstream files. [VERIFIED: local audit cross-check]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools and scripts were inspected locally. [VERIFIED: package manifests; local environment]
- Architecture: HIGH — contract conclusions come from the supplied authoritative upstream commit. [VERIFIED: napplet/naps@6461e4b]
- Pitfalls: HIGH — each follows an explicit upstream absence or a locked Phase 161 decision. [VERIFIED: napplet/naps@6461e4b; Phase 161 CONTEXT.md]

**Research date:** 2026-07-23  
**Valid until:** The upstream NAP track is living; re-check its head and the cited commit before implementation if planning is delayed beyond 7 days. [VERIFIED: AGENTS.md]
