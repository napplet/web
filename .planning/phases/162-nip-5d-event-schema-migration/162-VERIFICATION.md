# Phase 162 verification

Non-normative implementation evidence. Protocol authority: [NIP-5D PR 2303](https://github.com/nostr-protocol/nips/pull/2303), live head b9d1ab17eb695fca90d800b7b0f93ca0f6578874 rechecked on 2026-10-04; Manifest, Identity, Archetypes and Intents, and Required and Optional Capabilities. Runtime intent operations follow the living [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md).

| Requirement | Evidence | Result |
| --- | --- | --- |
| Current event schema supported | Vite writer and CLI current writer emit single raw artifact x, description content, R/O and z/i; event kinds remain 5129/15129/35129. Focused writer/validator tests and compiled deploy smoke checks pass. | Pass |
| Current reader verifies bytes | conformance event validator; apps/conformance signed-event resolution and hash mismatch tests. No legacy reader fallback. | Pass |
| Interactive format prompt, current default | selectManifestFormat tests and commandDeploy wiring; explicit legacy standalone smoke check. | Pass |
| Legacy boundary removable | manifest-legacy.ts plus manifest-format.ts; README removal instructions; legacy vectors retained. | Pass |
| Event migration and skill | Signed-source migration preview tests cover input preservation, tampering, ambiguity, missing description and overwrite refusal; skills contract checks include napplet-migrate. | Pass |
| Compatibility and cutoff docs | README, event-migration guide, Vite/CLI references and agent skill; versioned package manifests and JSR/Deno metadata agree. | Pass |
| Build/type/test gates | pnpm build (12 tasks), pnpm type-check (17 tasks), pnpm -r test:unit (490 tests), tutorial/browser checks and contract/export/release checks passed. | Pass |
| AI-slop gate | Pinned 0.12.0 scored 89; existing CI threshold 70, fail-on-error false. Three size warnings and one unpatched dependency advisory disclosed. | Pass with disclosed findings |
| Draft PR and hzrd149 | Await remote creation and reviewer-state verification. | Pending |

The current-spec single-file artifact requirement is reflected in the Vite default. Explicit external-assets mode is retained for tooling compatibility and documented as requiring rebundling before current deployment. Migration previews preserve hashes from signed source events but do not fetch or execute artifacts, sign replacement events, or migrate shell grants/data.
