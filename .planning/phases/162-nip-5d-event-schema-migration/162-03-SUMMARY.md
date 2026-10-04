# Phase 162 plan 03 — release and shipment

Implemented migration documentation, the napplet-migrate agent skill, current-schema package references, and explicit package cutoff guidance. Changesets were applied with pnpm version-packages: CLI 0.7.0, vite-plugin 0.15.0, conformance 0.18.0, conformance-cli 0.3.0, and private conformance-web 0.0.19. Legacy serialization remains CLI-only and its removal boundary is documented.

Validation: full build (12 tasks), full type-check (17 tasks), recursive unit tests (490 passed, including 131 CLI tests), skills/onboarding/convention/workflow contracts, JSR exports, release tooling and tutorial generation/build/browser conformance passed. The compiled CLI produced verified current and legacy dry-run manifests without network publication. Frozen-lockfile installation passed.

Pinned AI-slop 0.12.0 score: 89/100, passing the unchanged CI minimum of 70 with fail-on-error false. Remaining findings: CLI/output file sizes, syncJsrVersions function size, and the existing Changesets transitive braces advisory with no published fix. Patched available Vitest, PostCSS, js-yaml, nanoid and devalue dependency lines; no rules disabled.

Protocol findings: the live NAP-INTENT defines handled/windowId/newWindow, so the contrary contract guard was corrected. Current NIP-5D and the older NAP archetype registry disagree on manifest tags and namespace availability; documentation flags the drift. CLI deployment name restrictions remain an existing tool limitation, not a NIP rule. Ambiguous independent z/i advertisements require explicit legacy pairings rather than an invented cross product.

Shipment: local verification complete; draft PR creation and reviewer assignment pending. Original checkout main was fast-forwarded to origin/main; unrelated local changes were restored and the recovery stash retained.
