# Phase 161: Ad-hoc Convention Package Contracts - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Chase the removal of numbered NAPs from `napplet/naps` master commit
`6461e4b37c29dc09a20dff35d9515889c4433874` through the active Napplet package
contracts, manifest tooling, CLI, conformance fixtures, docs, skills, and tests.
Historical changelogs and archived planning remain historical.

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
canonical examples published by the upstream archetype registry. Treat them as
opaque convention names, not as restored versions of the removed NAP-1..5 payload
specifications.

</specifics>

<deferred>
## Deferred Ideas

Concrete convention payload specifications are absent upstream. Do not recreate
the removed NAP-1..5 schemas locally; that requires new upstream convention specs.

</deferred>
