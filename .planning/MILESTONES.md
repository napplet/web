# Milestones

## v0.31.0 Cleanup Quality Gate (Shipped: 2026-05-24)

**Phases completed:** 5 phases, 5 plans, 0 tasks

**Known deferred items at close:** 23 historical open artifacts acknowledged (see STATE.md Deferred Items)

**Key accomplishments:**

- Upgraded the vulnerable tooling dependency graph while preserving the Vite 6 compatibility path.
- Removed all Phase 144 scanner categories without behavior changes.
- Removed all production double-assertion and unsafe-assertion scanner findings.
- Removed the scanner's function-length warnings and documented the remaining file-size warnings as reviewed structural deferrals.
- v0.31.0 cleanup has passed the final scanner and workspace verification gate.

---

## v0.29.0 NUB-CONNECT + Shell as CSP Authority (Shipped: 2026-04-21)

**Phases completed:** 8 phases, 19 plans, 47 tasks

**Key accomplishments:**

- NUB-CONNECT draft authored at `.planning/phases/135-cross-repo-spec-work/drafts/NUB-CONNECT.md` with all 15 required H2 sections, 10 file-name citations of `NUB-CLASS-2.md`, and a byte-verified SHA-256 conformance fixture (`cc7c1b1903fb23ecb909d2427e1dccd7d398a5c63dd65160edb0bb8b231aa742`) for the canonical `connect:origins` aggregateHash fold.
- Extended @napplet/core with `'connect'` + `'class'` NUB domains, the `window.napplet.connect` namespace (readonly granted + origins), and the optional `window.napplet.class?: number` field; soft-deprecated `perm:strict-csp` via JSDoc pointing to `nub:connect` + `nub:class`.
- Two zero-dep types.ts files establishing the connect + class NUB subpaths: connect exports the shared normalizeConnectOrigin validator that becomes single-source-of-truth for Phase 138 and shell origin-validation; class exports the terminal class.assigned wire envelope type for Plan 02's dispatcher.
- Six new runtime-surface files complete the @napplet/nub/connect and @napplet/nub/class subpath scaffolds: connect mounts window.napplet.connect from a shell-injected meta tag (no wire), class mounts window.napplet.class as a readonly getter updated by a wire-dispatcher handler for class.assigned envelopes. Both barrels register their NUB domain on module evaluation — connect with an intentional noop (pure meta-tag NUB), class with the dispatcher handler wired via an `as unknown as NubHandler` contravariance bridge.
- 8 new subpath exports added to `packages/nub/package.json` (38 → 46 entries) and 8 matching tsup entry points added to `packages/nub/tsup.config.ts` (1:1 correspondence preserved). Build and type-check both green. All 16 new dist artifacts (8 .js + 8 .d.ts) emitted under `dist/connect/` and `dist/class/`. Tree-shake prerequisite verified at dist-artifact level — both `dist/connect/types.js` and `dist/class/types.js` contain zero installer / `registerNub(` references, satisfying NUB-07 and CLASS-06 source-contract gates (full bundler-harness proof deferred to Phase 142 VER-03). Phase 137 is now terminal-complete: all 13 REQs (NUB-01..07 + CLASS-01..06) satisfied.
- Stripped 376 LOC of v0.28.0 strict-CSP production machinery from `@napplet/vite-plugin` — deleted `csp.ts` in full, purged nonce/meta-injection/closeBundle-asserts from `index.ts`, replaced `strictCsp` option with a `@deprecated unknown`-typed accept-but-warn shim that emits exactly one `[nip5a-manifest] strictCsp is deprecated in v0.29.0 …` console.warn per build.
- Added 254 LOC of NUB-CONNECT surfaces to `@napplet/vite-plugin` — `connect?: string[]` option validated through the shared `normalizeConnectOrigin` from `@napplet/nub/connect/types`, aggregate-hash fold producing the NUB-CONNECT canonical `connect:origins` synthetic xTag (byte-identical to the spec's conformance fixture hash `cc7c1b1903fb23ecb909d2427e1dccd7d398a5c63dd65160edb0bb8b231aa742`), one `['connect', origin]` manifest tag per origin, module-scope `SYNTHETIC_XTAG_PATHS` registry replacing the hardcoded projection filter, a fail-loud `assertNoInlineScripts` regex diagnostic in closeBundle, an informational cleartext warning, and an optional dev-mode `napplet-connect-requires` meta for shell-less `vite serve` preview.
- Module-load-time conformance-fixture self-check (`assertConnectFoldMatchesSpecFixture`) binds the vite-plugin's `connect:origins` fold implementation to the NUB-CONNECT.md §Conformance Fixture digest `cc7c1b1903fb23ecb909d2427e1dccd7d398a5c63dd65160edb0bb8b231aa742`. Any drift (join delimiter, sort order, encoding, hash algorithm) throws at ESM-init, giving napplet authors an immediate loud failure instead of a silent grant-invalidation mismatch at shell-side later. Perturbation experiment confirmed the guardrail fires. Full 40+ Phase 138 grep audit passes. Build + type-check green. Phase 138 terminal — all 10 VITE-XX REQ-IDs satisfied.
- Wired installConnectShim + installClassShim into @napplet/shim and re-exported both NUB surfaces from @napplet/sdk, closing the Phase 136-carried TS2741 gap (`pnpm -r type-check` now green across all 14 packages).
- Non-normative shell-deployer checklist for NUB-CONNECT (209 lines, 12 H2 sections, parser-based residual-meta-CSP scan + 5-fixture conformance bundle, 16-box deployer audit checklist)
- Non-normative shell-deployer checklist for NUB-CLASS surfacing class-determination authority, wire timing, cross-NUB invariant (with 7-row scenario table), and revocation UX as sign-offable MUSTs — parallel companion to SHELL-CONNECT-POLICY.md.
- Five user-facing doc files swept to the v0.29.0 two-class posture with byte-identical preservation of all v0.28.0 resource NUB content; new window.napplet.connect + window.napplet.class runtime surfaces documented end-to-end and the canonical NUB-RESOURCE-first guidance shipped verbatim in root README + SKILL.
- vite-plugin README rewritten for the v0.29.0 surgery — strictCsp section replaced by deprecated-with-migration-pointer stub, new connect option documented with full origin accept/reject rules + normative conformance fixture digest, and a consolidated Build-Time Diagnostics section covering inline-script fail-loud, cleartext warning, and dev-mode connect-requires meta.
- Five VER gates closed mechanically — workspace build + type-check green across 14 packages, 4-file zero-grep audit clean, v0.29.0 changeset authored with 5 first-party minor bumps and loud breaking-change prose, PROJECT.md downstream-shell doc-check pass.
- 54 vitest tests across 4 files closing VER-03 (tree-shake), VER-06 (aggregateHash content-addressing), VER-11 (class wire dispatch), VER-12 (graceful degradation for both connect + class), and VER-13 (cross-NUB invariant) — permanent regression protection runnable by every future `pnpm vitest`
- Closed the 3 downstream-shell VER gates (VER-04/05/07) via self-contained documented Playwright fixtures at `packages/nub/src/connect/__fixtures__/`, authored `142-VERIFICATION.md` recording all 13 VER-IDs as PASS, and performed the milestone-close edits (STATE → ready-for-audit, PROJECT.md v0.29.0 → Shipped, REQUIREMENTS traceability → all 13 VER-XX Complete, ROADMAP Phase 142 → 3/3 Complete + v0.29.0 milestone checkbox ✅). Milestone v0.29.0 is READY-FOR-AUDIT.

---

## v0.30.0 Class-Gated Decrypt Surface (Shipped: 2026-04-23)

**Phases completed:** 4 phases, 13 plans, 33 tasks

**Key accomplishments:**

- Added 3 new wire-level message types (`identity.decrypt` / `.result` / `.error`) + `IdentityDecryptErrorCode` 8-code union + `UnsignedEvent` + `Rumor` (nostr-tools-canonical, no-sig) interfaces + `NappletGlobal.identity.decrypt(event)` method type — zero runtime code shipped; pure type contract for downstream shim (Plan 02) and SDK (Plan 03) to author against.
- Shipped `window.napplet.identity.decrypt(event)` live on the central @napplet/shim — decrypt() function in identity NUB shim (+ identity.decrypt.result handler branch reusing existing pendingRequests/sendRequest infrastructure) + barrel re-export + two surgical edits to packages/shim/src/index.ts. Workspace-wide type-check went fully green (stronger than predicted). Zero nostr-tools imports; all crypto runs shell-side.
- Shipped the named-import ergonomic layer for `identity.decrypt`: bare-name `identityDecrypt(event)` helper in `@napplet/nub/identity`, `identity.decrypt(event)` method on the central `@napplet/sdk` identity namespace, 4 new identity type re-exports + `Rumor` + `UnsignedEvent` core type re-exports on the `@napplet/sdk` public surface, and `identityDecrypt` bare-name re-export from `@napplet/sdk`. Exactly the v0.28.0 Phase 129 4-surgical-edit pattern — `DOMAIN` const untouched (already `'identity'` from v0.24.0). Workspace-wide `pnpm -r type-check` + `pnpm -r build` both exit 0 across all 14 packages.
- Stamped Phase 135 shipping gates: `pnpm -r build` + `pnpm -r type-check` both exit 0 across 14 packages (VER-01 + TYPES-06); identity-types-only esbuild tree-shake bundle is 129 bytes and contains ZERO occurrences of 7 forbidden runtime symbols (VER-05). All evidence under `/tmp/` per AGENTS.md; zero repo source changes.
- Closed 2 gaps from 135-VERIFICATION.md so ROADMAP SC1 now fully verifies: (1) added cross-package type-only re-exports of Rumor + UnsignedEvent to @napplet/nub/identity so `import { type Rumor } from '@napplet/nub/identity'` resolves; (2) refactored handleIdentityMessage in packages/nub/src/identity/shim.ts to use an exhaustive switch over all 21 IdentityNubMessage members with assertNever(narrowed) default branch — adding a new union member without a matching case now fails type-check. Workspace-wide build + type-check green across 14 packages; identity-types-only tree-shake bundle still 129 bytes with all 8 runtime symbols absent (including new assertNever helper). Empirical exhaustiveness proof captured: deliberate bogus union member triggers TS2345 at the assertNever call site.
- Chromium 144+ nonce-based `script-src` provably blocks legacy `<script>`-tag injection AND fires `securitypolicyviolation` with `violatedDirective: 'script-src-elem'` and `blockedURI: 'inline'` — 4-field report shape captured, `sourceFile: null` Chromium quirk documented for the Phase 137 amendment.
- Synthesized Plan 01's empirical CSP-block evidence into a single 93-line `136-PHASE-NOTES.md` Phase 137's amendment author reads verbatim — with grep-verified presence of all 7 required literal strings locking DETECT-02/03/04 documentation gates.
- Local branch `nub-identity-decrypt` on `~/Develop/nubs` created by merging `nub-class-1` into `nub-identity`, producing a clean merge base with BOTH spec files present and zero amendment content yet — ready for waves 2-4.
- Amended `NUB-CLASS-1.md` on `~/Develop/nubs` branch `nub-identity-decrypt` with the SHOULD `report-to` row and the MUST violation-correlation row (+ a new Security Considerations subsection distinguishing observability from enforcement), committed locally as `c020479` with zero hygiene violations and both VER-03 Group E verbatim phrases present.
- 1. [Rule 3 - Blocking] Audit-copy initial draft at 56 lines (below `min_lines: 80` threshold)
- VER-02 (3-channel hygiene grep) stamps pass zero matches across branch diff + commit log + PR body preview; VER-03 (7-group conformance grep) stamps pass zero FAILs across 40+ literal-string checks; `137-PHASE-NOTES.md` synthesizes the Phase 138 handoff; Phase 137 ship gate certified — `nub-identity-decrypt` is ready for human `git push` + draft PR open.
- specs/NIP-5D.md gains a 9-line v0.29.0 `### NIP-07 Extension Injection Residual` subsection documenting the `all_frames: true` injection vector, nonce-based `script-src` legacy-injection mitigation (Chromium 144+ `script-src-elem`), honest `world: 'MAIN'` residual acknowledgment, and `connect-src 'none'` structural mitigation pointing at `identity.decrypt` on NUB-IDENTITY as the spec-legal receive-side decrypt path for NUB-CLASS-1 napplets.
- Shipped the v0.29.0 milestone docs sweep for `identity.decrypt()`: the authoritative `## Identity NUB (v0.29.0)` subsection in `packages/nub/README.md` (54 lines; 8-code error table, NIP-04/44/17 auto-detect, NUB-CLASS-1 class gating, window.nostr prohibition), the `### identity` API Reference subsection in `packages/sdk/README.md` (27 lines; method table + bare-helper aliases + cross-link to the nub README), the v0.29.0 changelog bullet in the root `README.md` (4 lines; first-ever Changelog H2 section on this file), and the `## Step 11 — Decrypt NIP-17 / NIP-44 / NIP-04 events` section in `skills/build-napplet/SKILL.md` (55 lines; relay.subscribe→identity.decrypt code example + class-gating + window.nostr prohibition + perm:strict-csp capability detection). All 4 surfaces committed atomically on napplet main as commit ade7b65 (`docs(138-02): ...`). 140 total insertions, 0 deletions. Workspace-wide `pnpm -r type-check` exits 0 across 14 packages post-commit; nubs repo untouched; no push executed; Plan 138-01 parallel executor's specs/NIP-5D.md work unaffected.

---

## v0.28.0 Browser-Enforced Resource Isolation (Shipped: 2026-04-23)

**Phases completed:** 10 phases, 10 plans, 32 tasks

**Key accomplishments:**

- Added 'resource' to NubDomain (10 domains) + NappletGlobal.resource namespace with bytes() and bytesAsObjectURL() — pure type-only scaffold that unblocks the 9 downstream v0.28.0 phases
- @napplet/nub/resource subpath shipped — single-flight bytes(url) primitive with inline data: decoder, AbortSignal cancellation, and synchronous bytesAsObjectURL handle (Option C); zero downstream integration (Phase 128/129 territory)
- Optional `resources?: ResourceSidecarEntry[]` field added to `RelayEventMessage`; relay shim now invokes `hydrateResourceCache(msg.resources)` before `onEvent(msg.event)` so a synchronous `bytes(sidecarUrl)` inside the napplet's onEvent callback resolves from the single-flight cache with zero postMessage round-trips.
- `window.napplet.resource` mounted via central `@napplet/shim` (10-NUB integration pattern locked: 4 surgical edits — import block, handleEnvelopeMessage routing, global mount, install call). DEF-125-01 closed — workspace-wide `pnpm -r type-check` green across all 14 packages for the first time since Phase 125 introduced the planned breakage.
- Resource NUB exposed through @napplet/sdk via 4 surgical edits — namespace, domain const, 11 type re-exports, shim installer + SDK helper — completing the v0.28.0 SDK-side seam that mirrors Phase 128's central-shim integration.
- Strict 10-directive CSP enforcement in @napplet/vite-plugin with build-time hard-failure for all 4 project-killer pitfalls (Pitfalls 1, 2, 18, 19) — napplets opting in ship with a browser-enforced policy, and developer mistakes that would weaken the security posture cannot pass `pnpm build`.
- NIP-5D Security Considerations amended with `### Browser-Enforced Resource Isolation` subsection documenting strict-CSP SHOULD posture, `perm:strict-csp` capability identifier, NUB-RESOURCE cross-reference, and `allow-same-origin` prohibition reasoning
- Four NUB spec drafts authored as local artifacts at `.planning/phases/132-cross-repo-nubs-prs/drafts/` capturing the protocol-level surface for v0.28.0 Browser-Enforced Resource Isolation: NUB-RESOURCE (new spec, 300 lines, complete with 4 schemes / 8-code error vocabulary / SSRF MUSTs at DNS-resolution time / SVG sandboxed-Worker-no-network rasterization MUST), NUB-RELAY amendment (135 lines, additive optional `resources?` sidecar field with default-OFF privacy rationale and per-event-kind allowlist guidance), NUB-IDENTITY clarification (41 lines, doc-only, picture/banner URLs flow through `resource.bytes()`), NUB-MEDIA clarification (40 lines, doc-only, artwork URL flows through `resource.bytes()`). Public-repo hygiene clean across all 4 drafts (zero `@napplet/`, zero `kehto`, zero `hyprgate`, zero `packages/(nub|shim|sdk|vite-plugin)`). Workspace `pnpm -r type-check` stays green across all 14 packages (no source changes). All 18 REQ-IDs satisfied.
- 5 package READMEs + napplet-author skill + new shell-deployer policy checklist updated for v0.28.0 resource NUB / strict CSP surface; PROJECT.md + NUB-RESOURCE draft delegate v0.28.0 demo napplets to downstream shell repo per Option B
- All 7 VER gates PASS (workspace build+tc / CSP positive-block Playwright sim / SVG spec conformance / single-flight stampede / sidecar default-OFF / cross-repo zero-grep / tree-shake symbol absence); NUB-RESOURCE.md spec drift pre-resolved; milestone v0.28.0 audit passed (65/65 requirements satisfied, 9/9 cross-phase handoffs WIRED, 5/5 E2E flows WIRED, 0 orphaned / 0 unsatisfied).

---

## v0.27.0 IFC Terminology Lock-In (Shipped: 2026-04-19)

**Phases completed:** 3 phases, 5 plans, 17 tasks

**Key accomplishments:**

- Renamed the developer-facing runtime API from `ipc` to `ifc` across @napplet/core, @napplet/shim, @napplet/sdk, and @napplet/nub/ifc — hard break with no backward-compat alias, localized build + type-check green across all four packages.
- Four published READMEs (root + core + shim + sdk) swept to IFC terminology via 20 literal token-swap edits — zero structural rewrites, zero source files touched, zero `.planning/` drift, zero-leakage grep clean.
- `skills/build-napplet/SKILL.md` swept to IFC terminology via 2 literal frontmatter edits + 1 scoped Step 8 block-rewrite + 1 pitfalls bullet update — zero IFC leakage in the skill file, cold-reading agents now write `window.napplet.ifc.emit/on` against the Phase 122 surface.
- Active `.planning/` surface swept to IFC + accurate-transport terminology via 28 literal edits across 7 files — 18 codebase prose swaps + 2 TESTING.md transport-description swaps + 1 research code-fence swap + 9 FEATURES-CHANNELS.md swaps (2 plan-specified + 7 Rule 2 deviation extension). Seven documented-exception files preserved byte-identical. Phase 124 inherits a transparent trade-off record in 123-03-NOTES.md.
- `pnpm -r build` + `pnpm -r type-check` green across all 14 workspace packages; first-party-surface zero-grep clean (0 matches) across `packages/`, `specs/`, `skills/`, `README.md`, `.planning/codebase/`; 55 self-describing planning-doc matches path-excluded per 123-03-NOTES.md Option (a) and captured for audit transparency. v0.27.0 IFC Terminology Lock-In milestone mechanically proven complete; ready for `/gsd:audit-milestone`.

---

## v0.26.0 Better Packages (Shipped: 2026-04-19)

**Phases completed:** 5 phases, 12 plans, 24 tasks

**Key accomplishments:**

- Scaffolded @napplet/nub package at packages/nub/ with a 36-entry subpath exports map (9 barrels + 27 granular), matching tsup entry object, and no root '.' export — zero source code, zero build yet.
- 34 TypeScript source files copied byte-identical from packages/nubs/<domain>/src/ into packages/nub/src/<domain>/ across 9 domains; theme ships types-only so exports map + tsup config corrected from 36 → 34 entries in the same atomic commit.
- `pnpm --filter @napplet/nub build` green; 34 ESM entries + 34 .d.ts files emitted (plus 25 shared chunks from tsup code-splitting); all 9 runtime-resolution invariants verified from a real consumer context — EXP-04 fires ERR_PACKAGE_PATH_NOT_EXPORTED, all subpath categories resolve, theme/shim + theme/sdk correctly fail, types-only emits are runtime-pure, and the 8-of-9 registerNub asymmetry is preserved exactly.
- Source files (Task 1 — commit `2f9e626`):
- Stamped [DEPRECATED] description + `@napplet/nub` runtime dep onto all 9 deprecated nub package.json files and recorded the 0.3.0 minor bump via a single changeset — Plan 01's re-export shims now resolve at build time.
- Green `pnpm -r build` + `pnpm -r type-check` across the full 14-package monorepo with byte-level confirmation that all 9 deprecated @napplet/nub-<domain> packages emit dist/ that re-export from @napplet/nub, and runtime `Object.keys()` shape parity verified across all 9 domains — MIG-01 proven end-to-end from source to build emit to runtime surface.
- Shim (positive, each = 1):
- package.json manifest gates:
- Added the first authoritative landing doc for `@napplet/nub` — documents the 9-domain subpath layout, tree-shaking contract, theme exception, and the full migration path from the 9 deprecated `@napplet/nub-<domain>` packages.
- Four user-facing READMEs (root + core + shim + sdk) migrated off the deprecated `@napplet/nub-<domain>` names to the consolidated `@napplet/nub` package and its subpath surface, with the defunct `@napplet/nub-signer` references cleaned up in the process.
- Evidence-backed closure of DOC-03/DOC-04 — specs/NIP-5D.md and skills/build-napplet/SKILL.md both confirmed clean by grep + file-content read; phase-wide acceptance grep returns zero matches outside intentional migration-guidance and deprecation-banner scopes
- v0.26.0 Better Packages milestone acceptance gate passed: monorepo builds green across 14 packages, @napplet/nub/relay/types tree-shakes to a 39-byte bundle with zero registerNub and zero cross-domain refs, and all 9 deprecated @napplet/nub-<domain> shims type-round-trip cleanly.

---

## v0.25.0 Config NUB (Shipped: 2026-04-17)

**Phases completed:** 6 phases, 15 plans, 32 tasks

**Key accomplishments:**

- NUB-CONFIG.md skeleton drafted on nub-config branch of public napplet/nubs repo — setext header, API surface (NappletConfig interface + ConfigSchema/ConfigValues/ConfigSchemaError types), and full wire protocol (9 message types, 8 envelope examples)
- NUB-CONFIG.md completed in body: RFC-2119 conformance tables (MUST/SHOULD/MAY), explicit anti-feature rejection catalogue, four-subsection security section, and nine-code error-envelope vocabulary -- spec is structurally complete pending plan 111-04 publication
- NUB-CONFIG spec published to napplet/nubs#13 — README registry row added, zero @napplet/ leakage confirmed across all 5 branch commits, PR opened by human as gated shared-state action
- Scaffolded `@napplet/nub-config` — 13th package, 9th NUB — mirroring the identity NUB template exactly, plus JSON Schema dep edges (`@types/json-schema` devDep + optional `json-schema-to-ts` peerDep) so plan 02 can land `src/types.ts` against a resolved, buildable package.
- Landed the full `packages/nubs/config/src/types.ts` — 321 LOC containing all 8 NUB-CONFIG wire messages, schema/values/extension types, the ConfigSchemaErrorCode 8-literal union, the relocated DOMAIN constant, and 3 discriminated unions — plus the full barrel re-exporting 15 type symbols. Package build + type-check green; full monorepo type-check green across all 13 packages. Package surface is now ready for Phase 113's shim+SDK code.
- Full @napplet/nub-config napplet-side machinery: manifest-meta schema read, ref-counted subscriber fan-out, correlation-ID request tracking, and window.napplet.config mount — 371 LOC single-file implementation.
- Five bare-name SDK wrappers (get, subscribe, openSettings, registerSchema, onSchemaError) over a shared requireNapplet() guard, plus full-surface barrel re-exporting types + shim + SDK; @napplet/nub-config now ships a complete NUB implementation ready for phase-115 central-shim wiring.
- Added `configSchema?: JSONSchema7 | string` to @napplet/vite-plugin with strict 4-step discovery (inline object → inline path → config.schema.json → napplet.config.{ts,js,mjs}) populating `resolvedSchema` closure state for downstream guards and emission in 114-02/03.
- Added a pure, zero-dependency recursive structural guard to `@napplet/vite-plugin` that rejects NUB-CONFIG schemas violating any of the four build-time-detectable rules (root-shape, external `$ref`, `pattern` keyword, `x-napplet-secret`+`default` coexistence) before the manifest is emitted, wired via `configResolved` so malformed schemas fail the Vite build with a single multi-line diagnostic naming every violation at once.
- Emitted `['config', JSON.stringify(schema)]` on the kind 35128 NIP-5A manifest, fed schema bytes into `aggregateHash` via a synthetic `config:schema` xTags entry (filtered out of the `['x', ...]` projection), and injected `<meta name="napplet-config-schema" content="{JSON}">` into built index.html head — all three emissions null-guarded so napplets without a declared schema produce byte-identical manifest + HTML to pre-phase-114 behavior. Phase 114 complete.
- Wrote 248-line package README for @napplet/nub-config covering install, manifest-driven vs runtime schema declaration, the window.napplet.config API surface, SDK namespace usage, and FromSchema type inference via the json-schema-to-ts optional peerDependency.
- Documented NUB-CONFIG as the 9th NUB across the four napplet-repo package READMEs (core / shim / sdk / vite-plugin) -- every config-related public surface now has visible docs parity with identity/notify/media.
- PR OPENED: napplet/nubs#13

---

## v0.24.0 Identity NUB + Kill NIP-07 (Shipped: 2026-04-09)

**Phases completed:** 6 phases, 0 plans, 0 tasks

**Key accomplishments:**

- (none recorded)

---

## v0.23.0 Notify NUB (Shipped: 2026-04-09)

**Phases completed:** 4 phases, 0 plans, 0 tasks

**Key accomplishments:**

- (none recorded)

---

## v0.22.0 Media NUB + Kill Services (Shipped: 2026-04-09)

**Phases completed:** 5 phases, 0 plans, 0 tasks

**Key accomplishments:**

- (none recorded)

---

## v0.21.0 NUB Modularization (Shipped: 2026-04-09)

**Phases completed:** 3 phases, 0 plans, 0 tasks

**Key accomplishments:**

- (none recorded)

---

## v0.20.0 Keys NUB (Shipped: 2026-04-09)

**Phases completed:** 3 phases, 3 plans, 4 tasks

**Key accomplishments:**

- NUB-KEYS smart forwarding verified -- suppress list from keys.bindings, action keybinding API on window.napplet.keys, safety guards for IME/modifiers/Tab, unbound keys forwarded to shell
- keys namespace wrapper with register() convenience and full nub-keys type re-exports in @napplet/sdk
- NIP-5D Known NUBs domain table added with 6 domains; all package READMEs verified complete for keys NUB documentation

---

## v0.20.0 Keys NUB (Shipped: 2026-04-09)

**Phases completed:** 5 phases, 2 plans, 4 tasks

**Key accomplishments:**

- @napplet/nub-keys package with 6 typed message interfaces for keyboard forwarding and action keybindings per NUB-KEYS spec
- Added 'keys' as sixth NUB domain in envelope.ts and keys namespace with 3 methods to NappletGlobal in types.ts

---

## v0.19.0 Spec Gap Drops (Shipped: 2026-04-09)

**Phases completed:** 1 phases, 1 plans, 3 tasks

**Key accomplishments:**

- Deleted 7 unspecced artifacts from @napplet/core: Capability type, ALL_CAPABILITIES, 13 dropped TOPICS, 3 dead constants, and constants.ts file

---

## v0.18.0 Spec Conformance Audit (Shipped: 2026-04-09)

**Phases completed:** 4 phases, 4 plans, 10 tasks

**Key accomplishments:**

- Deleted 5 dead code items across core and shim: handshake types, uncalled function, dead re-export file, and leaked internal Maps
- Removed stale services.has() API, added missing theme NUB domain, and fixed D-02/D-03 decision ID artifacts across 5 files

---

## v0.17.0 Capability Cleanup (Shipped: 2026-04-08)

**Phases completed:** 3 phases, 3 plans, 2 tasks

**Key accomplishments:**

- NamespacedCapability template literal union type replacing flat NubDomain|string with structured nub:/perm:/svc: prefixes on ShellSupports.supports()

---

## v0.16.0 Wire Format & NUB Architecture (Shipped: 2026-04-07)

**Phases completed:** 6 phases, 10 plans, 20 tasks

**Key accomplishments:**

- NIP-5D v4 rewritten as transport+identity+manifest+NUB-negotiation spec with generic JSON envelope { type, ...payload } wire format -- zero protocol message definitions, 122 lines
- JSON envelope base types (NappletMessage, NubDomain, ShellSupports) added to @napplet/core with NIP-01 bus constants isolated in legacy.ts
- 4 NUB scaffold packages (relay, signer, storage, ifc) with domain-specific message types extending NappletMessage and template literal type constraints
- NUB dispatch infrastructure with factory-isolated registries, domain-prefix routing, and 12-test conformance suite
- Relay (9 messages) and signer (14 messages) NUB modules with full discriminated unions and core dispatch registration
- Storage (8 types) and IFC (14 types) NUB modules with full discriminated unions and core dispatch registration
- All 6 shim source files migrated from NIP-01 array wire format to JSON envelope messages using NUB module types, with window.napplet API signatures unchanged
- SDK re-exports all 62 NUB message types, 4 aliased domain constants, and core envelope types -- `import { RelaySubscribeMessage, relay } from '@napplet/sdk'` works
- @napplet/core and @napplet/shim READMEs rewritten for JSON envelope + NUB architecture with full wire format reference and deprecation notices
- Rewrote @napplet/sdk README and root README to reflect JSON envelope wire format and modular NUB architecture introduced in Phases 74-78.

---

## v0.15.0 Protocol Simplification (Shipped: 2026-04-07)

**Phases completed:** 4 phases, 4 plans, 8 tasks

**Key accomplishments:**

- Removed AUTH/handshake types and constants from @napplet/core, bumped protocol to v3.0.0, and updated EventTemplate to document unsigned-message contract
- Strip all signing code, keypair handling, AUTH flow, and nostr-tools dependency from @napplet/shim -- zero-crypto shim sends unsigned event templates via postMessage
- NIP-5D v3 rewritten for simplified wire protocol -- AUTH/REGISTER/IDENTITY removed, shell-assigned identity via MessageEvent.source, unsigned event templates
- All 5 package READMEs updated to reflect v0.15.0 no-crypto wire protocol: removed AUTH/keypair/nostr-tools/NIP-42 references, added message.source identity model, replaced RUNTIME-SPEC.md links with NIP-5D

---

## v0.14.0 Repo Cleanup & Audit (Shipped: 2026-04-06)

**Phases completed:** 2 phases, 3 plans, 5 tasks

**Key accomplishments:**

- Removed dead test:e2e turbo task, deleted stale Playwright artifacts and PRBODY.md, verified all 4 package exports and config files are clean
- Updated RUNTIME-SPEC.md, 3 skills, and 6 NUB specs to replace stale references
- Structured assessment of all remaining @napplet content with concrete stay/move/split recommendations

---

## v0.13.0 Runtime Decoupling & Publish (Shipped: 2026-04-06)

**Phases completed:** 6 phases, 11 plans, 18 tasks

**Key accomplishments:**

- Shell runtime packages extracted to separate repo with 4 packages (acl, runtime, shell, services)
- 40 source files migrated with import rewrites — full monorepo builds and type-checks clean
- Demo playground and test suite (252 unit + 127 e2e) migrated
- @napplet slimmed to 4-package SDK (core, shim, sdk, vite-plugin) — 29,500 lines removed
- GitHub Actions CI/CD workflows for @napplet npm publishing with changesets integration
- Root README and all package READMEs updated for 4-package SDK

### Known Gaps

- `PUB-04`: npm publish deferred — requires human npm auth (npm login + NPM_TOKEN GitHub secret)

---

## v0.12.0 Spec Packaging (Shipped: 2026-04-06)

**Phases completed:** 1 phase, 1 plan, 2 tasks

**Key accomplishments:**

- Renamed SPEC.md to RUNTIME-SPEC.md with internal-reference header distinguishing it from the NIP standard
- Finalized NIP-5D v2 with References section listing NIP-01, NIP-07, NIP-42, NIP-45, NIP-5A
- Updated 8 package READMEs and 4 source files to reference RUNTIME-SPEC.md
- NIP-5D at 199 lines — all nips format conventions met, ready for submission

### Known Gaps

- `RES-01`: NIP number conflict with Scrolls PR#2281 — unresolved, carry forward
- `NUB-01`, `NUB-02`, `NUB-03`: NUB governance and interface specs — descoped from v0.12.0, move to future milestone

---

## v0.11.0 Clean up Side Panel (Shipped: 2026-04-05)

**Phases completed:** 3 phases, 4 plans, 8 tasks

**Key accomplishments:**

- ConstantDef extended with relevantRoles topology annotations and three query methods (getEditableDefs, getReadOnlyDefs, getByRole) for downstream tab reorganization and contextual filtering
- Read-only protocol kind reference cards in new kinds-panel.ts; Constants panel constrained to editable-only values with domain-based header update
- Three-tab inspector (Node/Constants/Kinds) with tab persistence across node selection and polling timer guard preventing slider/input destruction
- Constants tab filters by selected topology node role with show-all toggle and role-aware empty state

---

## v0.10.0 Demo Consistency and Usability Pass (Shipped: 2026-04-04)

**Phases completed:** 5 phases, 20 plans, 28 tasks

**Key accomplishments:**

- AclCheckEvent now carries the triggering NIP-01 message, and every enforce() decision is captured in a per-napplet ring buffer
- Full-screen capability matrix modal shows granted/revoked/default state for all napplets across all 10 ACL capabilities
- Inspector panel now shows per-capability status, denial history with expandable raw events, and a policy matrix button on the ACL node
- ACL ring buffer size wired to demo-config constants panel; full build and type-check pass clean
- Persistent handler store and toggleService()/isServiceEnabled() API in shell-host.ts for runtime service disable/re-enable
- Interactive capability grid cells and services toggle section in ACL policy modal with external refresh support
- Toggle icon overlay on topology service nodes with visual dimming for disabled state and callback-based event wiring
- Full bidirectional sync between topology toggles, ACL modal, and inline ACL panel for consistent state across all views
- Hop-by-hop edge color sweep animation engine with active animation counter and configurable 150ms hop duration
- Extended PersistenceMode to 4-way union with 'trace' — no-op recording and null queries for ephemeral animation mode
- Trace button added as 4th color mode option; flow animator dispatches hop-by-hop animateTrace on each message in trace mode
- Clean transitions between trace and other modes — cancels pending animations and clears node overlays

---

## v0.9.0 Identity & Trust (Shipped: 2026-04-03)

**Phases completed:** 3 phases, 7 plans, 15 tasks

**Key accomplishments:**

- Shell-delegated deterministic keypair handshake (REGISTER -> IDENTITY -> AUTH) replacing ephemeral keys — storage now survives page reloads
- Pubkey-free storage scoping (`dTag:aggregateHash:userKey`) with triple-read backward-compatible migration across 3 historical formats
- SEC-01 guard blocking delegated keys from external relay publishing — only the user's signer (NIP-07/NIP-46) signs events that leave the shell
- Aggregate hash verification with in-memory caching — warns on mismatch but does not block registration
- Permanent removal of deprecated RuntimeHooks/ShellHooks type aliases — importing old names now fails at compile time
- SPEC.md updated for new handshake (Section 2), storage model (Section 5), and delegated key security (Section 14)

---

## v0.8.0 Shim/SDK Split (Shipped: 2026-04-02)

**Phases completed:** 6 phases, 10 plans, 5 tasks

**Key accomplishments:**

- (none recorded)

---

## v0.7.0 Ontology Audit and Adjustments (Shipped: 2026-04-02)

**Phases completed:** 7 phases, 16 plans

**Key accomplishments:**

- Complete `napp→napplet` rename — 87+ identifiers across 19 files in all 7 packages; deprecated aliases ship for one release cycle (v0.9.0 removal)
- `BusKind.INTER_PANE → IPC_PEER` across 30+ call sites and SPEC.md; `IPC-*` namespace established for future `IPC-BROADCAST`/`IPC-CHANNEL` additions
- `ConsentRequest` consolidated to `@napplet/runtime` canonical with `type` discriminator; stale shell copy removed; shell re-exports from runtime
- `RuntimeAdapter`/`ShellAdapter` replace `RuntimeHooks`/`ShellHooks` — 13 public interfaces renamed to `*Adapter` convention; deprecated aliases for one release cycle
- `SessionEntry`/`SessionRegistry` replace `NappKeyEntry`/`NappKeyRegistry`; `createEphemeralKeypair()` (no params) replaces `loadOrCreateKeypair(_nappType)`
- Topic prefix direction semantics documented in `core/topics.ts` JSDoc; `nappStorage` marked `@deprecated`; SPEC.md fully corrected for all stale `napp:` strings

---

## v0.6.0 Demo Upgrade (Shipped: 2026-04-01)

**Phases completed:** 7 phases, 28 plans, 28 tasks

**Key accomplishments:**

- Layered topology model and generated demo architecture view that separates napplets, shell, ACL, runtime, and wired services
- Topology-aware message highlighting and responsive architecture layout that keep shell, ACL, runtime, and signer-service paths readable
- SignerConnectionState model with NIP-07 browser extension connect flow, signer node topology UX showing connected/disconnected state, and shell-host decoupled from mock signer as primary path
- NIP-46 WebSocket requester client, connect modal with NIP-07/NIP-46 side-by-side panes, QR code generation for nostrconnect://, and real connectNip46() implementation.
- Tap wiring for signer request recording, extended topology render tests, and end-to-end verification of all SIGN requirements.
- File:
- File:
- One-liner:
- Task 1: Add curve: 0 to Leader Line BASE_OPTIONS
- One-liner:
- Objective:
- Summary:
- Enabled 90-degree orthogonal topology edge routing by replacing invalid `curve: 0` with correct `path: 'grid'` in Leader Line BASE_OPTIONS
- One-liner:
- One-liner:
- One-liner:

---

## v0.5.0 Documentation & Developer Skills (Shipped: 2026-04-01)

**Phases completed:** 4 phases, 12 plans, 0 tasks

**Key accomplishments:**

- Created READMEs for 4 new packages (@napplet/acl, @napplet/core, @napplet/runtime, @napplet/services) — complete API documentation from source
- Updated root README and 3 existing package READMEs (shim, shell, vite-plugin) to reflect 7-package v0.4.0 SDK
- Rewrote SPEC.md Section 11 (service discovery), renamed all PseudoRelay → ShellBridge, documented requires/compat protocol (Sections 2.9, 2.10, 15.6)
- Created 3 agentskills.io-format portable skill files: build-napplet, integrate-shell, add-service — agents can build with napplet without reading the full spec

---

## v0.4.0 Feature Negotiation & Service Discovery (Shipped: 2026-03-31)

**Phases completed:** 6 phases, 19 plans, 43 tasks

**Key accomplishments:**

- Service dispatch backbone — `ServiceDescriptor` in @napplet/core; `ServiceHandler`, `ServiceRegistry`, and topic-prefix routing in @napplet/runtime
- Kind 29010 discovery protocol — runtime synthesizes one EVENT per registered service + EOSE; live subscriptions update dynamically when services register
- `@napplet/services` package — `createAudioService` and `createNotificationService` as first-class `ServiceHandler` implementations proving the pattern
- `window.napplet` global on shim — `discoverServices()`, `hasService()`, `hasServiceVersion()` with session-scoped cache; no import needed in napplet code
- Manifest compatibility system — vite-plugin injects `requires` tags; runtime checks at AUTH time; `CompatibilityReport` via `onCompatibilityIssue`; strict/permissive mode
- Core infra as services — signer, relay pool, and cache extracted as `ServiceHandler`s; `RuntimeHooks.relayPool`/`.cache` now optional; dual-path dispatch with hook fallback

---

## v0.3.0 Runtime and Core (Shipped: 2026-03-31)

**Phases completed:** 6 phases, 18 plans, 38 tasks

**Key accomplishments:**

- Zero-dep @napplet/core package with all shared protocol types, constants, and topic definitions
- Shell imports all protocol types from @napplet/core — 232 lines of duplicate definitions removed
- Shim imports all protocol types from @napplet/core — 55 lines of duplicate definitions removed
- createShellBridge() rewired to delegate to createRuntime(adaptHooks(hooks)) — shell-bridge.ts reduced from 746 to 180 lines
- Shim types already re-exported from @napplet/core — verified builds and public API unchanged
- Cross-package dependency graph verified clean — full monorepo builds and type-checks with core -> acl -> runtime -> shell DAG
- Removed 8 dead exports from @napplet/shell, deleted duplicate enforce.ts, re-pointed enforce re-exports to @napplet/runtime

---

## v0.2.0 Shell Architecture Cleanup (Shipped: 2026-03-31)

**Phases completed:** 5 phases, 11 plans, 25 tasks

**Key accomplishments:**

- Renamed all PseudoRelay/createPseudoRelay/PSEUDO_RELAY_URI references to ShellBridge/createShellBridge/SHELL_BRIDGE_URI across shell, shim, demo, tests, spec, and docs — hard cut, zero aliases
- @napplet/acl package created with zero dependencies, 10 capability bit constants, and immutable AclState/AclEntry/Identity types enforced by ES2022-only tsconfig
- Implemented pure check() with 3-path decision logic and 9 state mutation functions — all zero-side-effect, immutable-by-construction
- @napplet/acl builds and type-checks with zero errors — complete public API (27 exports) verified self-contained with zero external dependencies

---

## v0.1.0 Alpha (Shipped: 2026-03-30)

**Phases completed:** 6 phases, 30 plans, 12 tasks

**Key accomplishments:**

- Added event.source === window.parent guard clauses to all three shim message handlers to prevent message forgery from co-loaded scripts
- Replaced comma-joined storage key serialization with repeated NIP ['key', name] tags to prevent data corruption on keys containing commas
- Renamed all legacy protocol identifiers to napplet across all packages, spec, and plugin docs
- Added unified rejectAuth() helper to clear pending message queue and send NOTICE on all 5 AUTH rejection paths, fixing security race condition
- Playwright smoke test proves AUTH handshake completes between shell and napplet in real browser with sandboxed iframes and real Schnorr signatures

---
