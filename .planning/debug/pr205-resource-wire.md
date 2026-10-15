---
status: investigating
trigger: "Resolve https://github.com/napplet/web/pull/205#issuecomment-6131418214"
created: 2026-10-14
updated: 2026-10-14
---

# PR #205 resource wire migration

## Current Focus

Hypothesis: Resource types, transport, injected adapters, and optimizer fixtures retain a superseded NAP-RESOURCE contract. Their passing tests cannot establish interoperability with the current proposal.

Next action: Integrate current main without rewriting PR history, then migrate and verify the resource wire boundary.

## Symptoms and evidence

- The referenced comment identifies bulk `requests` and host `Blob` wire values as the unresolved blocker after successful branch synchronization.
- PR #205 is open at `d3461adfc1231bd1cbcd173c712ed87e7c16632c`; current main `efc64764` conflicts with it. Original feature and both planning lineages must remain reachable. Do not merge the PR automatically.
- Original workspace has unrelated package/lock edits and generated files. Work proceeds in a clean worktree on `fix/pr205-resource-wire`, tracking the existing PR branch.
- Live NAP-RESOURCE PR #80 head is `ae5b9c64ab8a4d8909f288829a01e99d6bd713bc`. Its Wire Protocol and Byte encoding sections define `urls` and canonical padded base64; its web binding requires validation and conversion to browser Blobs. NIP-5D PR #2303 remains at `020cb8b33a9e4c6b8ca4b2f9d0ed0a67843b68f7`.
- Graph discovery returned only archived documentation, so current source inspection uses direct files and literal searches.

## Plan and acceptance

1. Preserve existing branch history and integrate current main. Retain both phase-162 planning lineages and current single-file artifact rules.
2. Align shared public types, SDK wrappers, resource shim, conformance adapters, and optimizer requests with the current resource contract. Retire superseded server fields and request-object bulk envelopes. Use BUD-10 URL hints where the optimizer needs locations.
3. Validate canonical base64 before successful delivery or cache hydration, including empty and binary byte vectors, padding bits, malformed inputs, mixed bulk outcomes, ordering, cancellation, and late results. Preserve application-facing Blob results.
4. Update affected fixtures, docs, and package changesets. Check dependent sidecar and data-URL paths against the current specification; do not retain obsolete carriers or bypass runtime policy.
5. Run targeted regressions, build, type-check, recursive unit tests, required contracts and integration checks, and the unchanged AI-slop gate. Commit each cohesive green checkpoint.
6. Push normally to the existing PR branch, update its description with current evidence, and verify checks at the final SHA. Leave PR #205 open.

## Source authority

This record is non-normative. Protocol decisions defer to [NAP-RESOURCE](https://github.com/napplet/naps/pull/80), its [web binding](https://github.com/napplet/naps/blob/nub-resource/projections/web.md#resource-binding), and [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303). The task authorizes correction of the comment's migration blocker; it does not authorize inventing missing protocol surface.

## Resolution

Pending implementation and verification.
