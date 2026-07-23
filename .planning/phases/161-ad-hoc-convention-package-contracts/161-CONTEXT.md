# Phase 161: Ad-hoc Convention Package Contracts - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Chase the removal of numbered NAPs from `napplet/naps` commit
`6461e4b37c29dc09a20dff35d9515889c4433874` and the follow-up NAP-INC
clarification in draft PR
[`napplet/naps#89`](https://github.com/napplet/naps/pull/89) at exact head
[`34ec29fc4039384a83dbd6b476f83c4fa0d038e6`](https://github.com/napplet/naps/blob/34ec29fc4039384a83dbd6b476f83c4fa0d038e6/naps/NAP-INC.md)
through the active Napplet package contracts, manifest tooling, CLI, conformance
fixtures, docs, skills, and tests. Historical changelogs, completed plan
histories, and archived planning remain historical.

</domain>

<decisions>
## Implementation Decisions

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
- **D-01:** Implement NAP-INC convention-URI query transposition exactly as
  specified by draft PR #89 at head
  `34ec29fc4039384a83dbd6b476f83c4fa0d038e6`: the runtime-facing clean-break
  API is `emit(topic, payload?)`; a queried
  `napplet:<archetype>/<intent>?name=value` call emits the queryless stable topic
  plus a shallow text-to-text payload map. Percent decoding preserves literal
  `+`; fragments, malformed percent encoding, repeated decoded names, and query
  plus explicit payload are rejected before `postMessage`.
- Query transposition is an `emit` preprocessing rule, not topic matching.
  Subscriptions, shell routing, and delivered `inc.event.topic` continue to use
  exact complete-string equality with no wildcard, prefix, case, Unicode, or
  routing-time query normalization.
- Keep NAP-INTENT `convention`/`conventions` and NIP-5A archetype metadata opaque.
  PR #89 does not authorize query parsing in intent discovery, invocation,
  manifest producers, CLI metadata, or shell matching.

### History and coverage
- Preserve changelog and archived-planning references that describe released
  history or old project requirement IDs.
- Update every active author-facing source, fixture, CLI prompt, package README,
  documentation page, and skill that teaches numbered protocols.

### the agent's Discretion
- Exact internal helper names and task partitioning, provided the public and wire
  contracts match the cited upstream commit and the full repository gates pass.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing intent discriminated unions and request/result shims provide the rename path.
- Vite-plugin `buildArchetypeTags` and CLI archetype parsers centralize manifest emission.
- Existing conformance reference-shell fixtures cover intent availability and dispatch.

### Established Patterns
- Protocol changes are clean breaks when upstream removes a contract.
- Active docs move with code; changelogs preserve semantic history.
- Changesets are required for every package with changed shipped output.

### Integration Points
- `packages/core`, `packages/nap`, `packages/vite-plugin`, `packages/cli`,
  `packages/conformance`, `packages/sdk`, `packages/shim`, `apps/docs`, and
  mirrored `packages/skills/skills` content.

</code_context>

<specifics>
## Specific Ideas

Use `napplet:note/open`, `napplet:profile/open`, and `napplet:dm/open` as the
canonical stable-topic examples published by the upstream archetype registry.
For a per-message text value, use the PR #89 developer-facing convention-URI
form such as `napplet:profile/open?pubkey=abc123`, which the runtime transposes
before exact routing. Treat the names as conventions, not as restored versions
of the removed NAP-1..5 payload specifications.

</specifics>

<deferred>
## Deferred Ideas

Concrete convention payload specifications remain absent upstream. PR #89
defines only generic shallow text query transposition for NAP-INC `emit`; it does
not define the meaning of `pubkey` or any other convention field. Do not recreate
the removed NAP-1..5 schemas locally; semantic payload contracts still require
new upstream convention specifications. NAP-INTENT query behavior remains
deferred because PR #89 changes NAP-INC only.

</deferred>
