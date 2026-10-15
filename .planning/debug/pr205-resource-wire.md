---
status: verifying
trigger: "Resolve https://github.com/napplet/web/pull/205#issuecomment-6131418214"
created: 2026-10-14
updated: 2026-10-14
---

# PR #205 resource wire migration

## Current Focus

Root cause: Resource types, transport, injected adapters, and optimizer fixtures retained a superseded NAP-RESOURCE contract. Existing tests asserted that obsolete contract.

Next action: Push the verified migration to the existing PR branch, then verify every applicable GitHub check at the final SHA.

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

Implemented in `16cc8a49`; large-reference-fixture handling corrected in `abe60708`. Merge `633e84d3` preserves original feature `f52cc924`, previous PR head `d3461adf`, and fetched main `efc64764` as ancestors. Both phase-162 planning directories remain intact.

- Public `bytesMany` accepts URL strings; request envelopes contain `urls`, and separate resource `servers`/`maxServers` fields are retired. BUD-10 URL hints remain available.
- `ResourceBytes` describes canonical padded base64. Wire results use it while application results retain Blobs. Validation rejects host byte objects, URL-safe alphabet, whitespace, missing/excess padding, and nonzero padding bits. Empty bytes and the specification's `AAEC/w==` vector decode correctly.
- Bulk conversion preserves order and length, retains per-item failures, and rejects malformed results. Cancellation suppresses late replies. Imported sidecars validate before cache hydration; malformed sidecars reject query promises and never reach subscription callbacks.
- Current NAP-RELAY head `9f30b350` and NAP-OUTBOX head `8865f73d` explicitly declare optional resource wire dependencies, so their imported sidecars remain supported. The resource proposal itself does not invent their carriers.
- Data URLs pass through runtime policy. The optimizer emits BUD-10 URIs and URL-list bulk calls. Its integration regression uses the actual built resource shim and JSON-serialized base64 responses, then verifies recovered octets and MIME. The large fixture recovers all seven assets; final single-file HTML is 25,617 bytes with SHA-256 `bd15b362ea463c0883bd5cbb0ec3d5de946b99de45ba4e791520b71333320da8`.
- Documentation, migration examples, wire types, conformance fixtures, and breaking changesets move together. Boilerplate and fixture searches found no additional old resource call sites outside the migrated packages.

## Verification evidence

- Root build: 13 tasks pass; root type-check: 20 tasks pass; recursive unit suite passes. Full `pnpm test` passes, including release/JSR/skills/tutorial checks. The final post-review build/type/unit logs use `/tmp/napplet-pr205-{build,types,units}-final.log`.
- Resource/types/relay/outbox regressions: 43 pass. Focused conformance tests: 58 pass; additional large-reference regression passes. Optimizer integration/loader/large-fixture tests: 18 pass.
- Conformance e2e: 5/5 pass. Workflow, onboarding and convention contracts pass. Assembled SPA/docs link crawl: 25 URLs, no broken internal links.
- Native macOS ARM standalone test with empty host-tool PATH and npm-runner compatibility test: 2/2 pass. Five-platform verification remains the GitHub matrix's responsibility.
- AI-slop 0.12.0: 93/100, zero errors, five existing warnings, unchanged configuration. The merged baseline independently reproduces the boot-prelude nesting warning; remaining warnings are existing output complexity, manifest/reference file size, and the moderate fflate advisory. No 100/100 or clean security audit claim is made.
- The first build overlapped an independently started type-check build and observed temporarily missing NAP declarations. The subsequent sequential build passes; this was a local orchestration error, not a source workaround.

## Evidence limits

The conformance reference shell is a mock; these results establish wire compatibility and application byte recovery, not production DNS/SSRF/MIME policy or the web binding's network-isolation enforcement. The existing browser harness does not establish the latter prerequisite. Hosts must satisfy the living binding before exposing resource; no private handshake, CSP artifact rule, or new protocol field was added. The tutorial still reports six harness-unmeasured checks, and ordinary CLI units retain two opt-in tests that were run separately above.

PR #205 stays open. Final remote checks and pushed-head equality are recorded in its description after delivery, so this file does not pretend to know its own future commit SHA.
