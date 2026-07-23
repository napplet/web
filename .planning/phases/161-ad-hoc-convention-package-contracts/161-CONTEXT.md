# Phase 161: Ad-hoc Convention Package Contracts - Context

**Gathered:** 2026-07-23
**Status:** Amended for adopted PR #89-#91 draft heads

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

### Adopted PR #89-#91 amendment
- **D-02:** Adopt and pin the proposed contract texts at NAP-INC PR #89 head
  `4593ce9e301ce098fd3dad64206fcd6f144fa7af`, web-projection PR #90 head
  `896c32c92deee68dc4d10fc1132b62df20cccb6f`, and NAP-INTENT PR #91 head
  `a718915ddefa2f03a0126579601f59d8bd86f7c4`. These heads supersede the
  earlier Phase 161 intent and manifest decisions where they conflict.
- **D-03:** Share one convention-URI normalizer between the two explicitly
  adopted developer boundaries: INC `emit(topic, payload?)` and intent
  `invoke/open(uri, options?)`. Queryless routing, subscriptions, manifest
  matching, and every other NAP remain exact and unparsed.
- **D-04:** Restore the adopted public `IntentContract` and candidate
  `contracts` surface; make URI-derived request identity required; expose
  acceptance (`ok: true`) separately from eventual delivery. Remove
  `handled`, `windowId`, `behavior.newWindow`, and every public delivery ID.
- **D-05:** Add carrier-neutral `intent.deliver` and `onDelivery`. Retain every
  delivery received before listener registration in internal FIFO order and
  drain it losslessly when the first handler registers. Queue cardinality is
  not public contract surface. Delivery must not depend on INC or on a
  particular source/target window lifecycle.
- **D-06:** Derive INC and intent delivery senders from the authenticated
  runtime endpoint. Ignore or reject caller-supplied sender data; never copy it
  into a delivery.
- **D-07:** Treat each queryless manifest archetype tag as one
  `IntentContract { convention, eventKinds? }`; parse same-tag
  `kind:<number>` fields only as optional unsigned discovery metadata. Never
  inspect payloads to infer kinds.
- **D-08:** Add `eventKinds?: number[]` to the existing object-shaped Vite and
  CLI metadata. Do not invent a kinds delimiter, wizard spelling, or CLI flag;
  preserve and emit kinds through config and template metadata.
- **D-09:** Upgrade the reference shell with an explicit authenticated endpoint
  fixture. Invocation returns an accepted result first; target delivery is a
  separate no-ID push whose sender comes only from that endpoint fixture.

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
new upstream convention specifications. The former deferral of NAP-INTENT query
behavior is superseded only by D-02 through D-05 at the adopted PR #91 head;
payload meaning, lifecycle policy, retry policy, persistence policy, and
INC-coupled delivery remain deferred.

</deferred>
