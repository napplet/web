# Roadmap: Napplet Protocol SDK

## Milestones

- ✅ **v0.1.0 Alpha** — Phases 1-6 (shipped 2026-03-30) — [Archive](milestones/v0.1.0-ROADMAP.md)
- ✅ **v0.2.0 Shell Architecture Cleanup** — Phases 7-11 (shipped 2026-03-31) — [Archive](milestones/v0.2.0-ROADMAP.md)
- ✅ **v0.3.0 Runtime and Core** — Phases 12-17 (shipped 2026-03-31) — [Archive](milestones/v0.3.0-ROADMAP.md)
- ✅ **v0.4.0 Feature Negotiation & Service Discovery** — Phases 18-22.1 (shipped 2026-03-31) — [Archive](milestones/v0.4.0-ROADMAP.md)
- ✅ **v0.5.0 Documentation & Developer Skills** — Phases 23-26 (shipped 2026-04-01) — [Archive](milestones/v0.5.0-ROADMAP.md)
- ✅ **v0.6.0 Demo Upgrade** — Phases 27-33 (shipped 2026-04-01) — [Archive](milestones/v0.6.0-ROADMAP.md)
- ✅ **v0.7.0 Ontology Audit and Adjustments** — Phases 34-40 (shipped 2026-04-02) — [Archive](milestones/v0.7.0-ROADMAP.md)
- ✅ **v0.8.0 Shim/SDK Split** — Phases 41-44 (shipped 2026-04-02) — [Archive](milestones/v0.8.0-ROADMAP.md)
- ✅ **v0.9.0 Identity & Trust** — Phases 46-48 (shipped 2026-04-03) — [Archive](milestones/v0.9.0-ROADMAP.md)
- ✅ **v0.10.0 Demo Consistency and Usability Pass** — Phases 49-53 (shipped 2026-04-04) — [Archive](milestones/v0.10.0-ROADMAP.md)
- ✅ **v0.11.0 Clean up Side Panel** — Phases 54-56 (shipped 2026-04-05) — [Archive](milestones/v0.11.0-ROADMAP.md)
- ✅ **v0.12.0 Spec Packaging** — Phase 61 (shipped 2026-04-06) — [Archive](milestones/v0.12.0-ROADMAP.md)
- ✅ **v0.13.0 Runtime Decoupling & Publish** — Phases 62-67 (shipped 2026-04-06) — [Archive](milestones/v0.13.0-ROADMAP.md)
- ✅ **v0.14.0 Repo Cleanup & Audit** — Phases 68-69 (shipped 2026-04-06) — [Archive](milestones/v0.14.0-ROADMAP.md)
- ✅ **v0.15.0 Protocol Simplification** — Phases 70-73 (shipped 2026-04-07) — [Archive](milestones/v0.15.0-ROADMAP.md)
- ✅ **v0.16.0 Wire Format & NUB Architecture** — Phases 74-79 (shipped 2026-04-07) — [Archive](milestones/v0.16.0-ROADMAP.md)
- ✅ **v0.17.0 Capability Cleanup** — Phases 80-82 (shipped 2026-04-08) — [Archive](milestones/v0.17.0-ROADMAP.md)
- ✅ **v0.18.0 Spec Conformance Audit** — Phases 83-86 (shipped 2026-04-09) — [Archive](milestones/v0.18.0-ROADMAP.md)
- ✅ **v0.19.0 Spec Gap Drops** — Phase 87 (shipped 2026-04-09) — [Archive](milestones/v0.19.0-ROADMAP.md)
- ✅ **v0.20.0 Keys NUB** — Phases 88-92 (shipped 2026-04-09) — [Archive](milestones/v0.20.0-ROADMAP.md)
- ✅ **v0.21.0 NUB Modularization** — Phases 93-95 (shipped 2026-04-09) — [Archive](milestones/v0.21.0-ROADMAP.md)
- ✅ **v0.22.0 Media NUB + Kill Services** — Phases 96-100 (shipped 2026-04-09) — [Archive](milestones/v0.22.0-ROADMAP.md)
- ✅ **v0.23.0 Notify NUB** — Phases 101-104 (shipped 2026-04-09) — [Archive](milestones/v0.23.0-ROADMAP.md)
- ✅ **v0.24.0 Identity NUB + Kill NIP-07** — Phases 105-110 (shipped 2026-04-09) — [Archive](milestones/v0.24.0-ROADMAP.md)
- ✅ **v0.25.0 Config NUB** — Phases 111-116 (shipped 2026-04-17) — [Archive](milestones/v0.25.0-ROADMAP.md)
- ✅ **v0.26.0 Better Packages** — Phases 117-121 (shipped 2026-04-19) — [Archive](milestones/v0.26.0-ROADMAP.md)
- ✅ **v0.27.0 IFC Terminology Lock-In** — Phases 122-124 (shipped 2026-04-19) — [Archive](milestones/v0.27.0-ROADMAP.md)
- ✅ **v0.28.0 Browser-Enforced Resource Isolation** — Phases 125-134 (shipped 2026-04-23) — [Archive](milestones/v0.28.0-ROADMAP.md)
- ✅ **v0.29.0 NUB-CONNECT + Shell as CSP Authority** — Phases 135-142 (shipped 2026-04-21) — [Archive](milestones/v0.29.0-ROADMAP.md)
- ✅ **v0.30.0 Class-Gated Decrypt Surface** — Phases 135-138 (shipped 2026-04-23) — [Archive](milestones/v0.30.0-ROADMAP.md)
- 🚧 **v0.31.0 Cleanup Quality Gate** — Phases 143-147 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Note: Phase 45 (IPC terminology cleanup) was completed as a quick task during v0.8.0 and is not part of the v0.9.0 roadmap. Phases 57–60 were deprecated after v0.11.0 and archived under `milestones/v0.12.0-phases/deprecated/`.

### 🚧 v0.31.0 Cleanup Quality Gate (In Progress)

**Milestone Goal:** Turn the current `aislop` security, lint, type-safety, and code-quality findings into a green, behavior-preserving quality gate. Security dependency upgrades land first; low-risk fixable cleanup follows; type-safety and structural work are protected by regression tests and existing workspace verification.

- [x] **Phase 143: Dependency Security Upgrade** — Upgrade the root dependency graph so `vite`, transitive `postcss`, and `turbo` resolve to patched versions; prove build, type-check, tests, and the security scanner still pass. Requirements: SEC-01, SEC-02, SEC-03, SEC-04. (completed 2026-05-24)
- [ ] **Phase 144: Fixable Lint and Slop Cleanup** — Remove duplicate imports, unused imports, leftover console diagnostics, duplicated shim logic, decorative narrative comments, and trivial comments without changing public behavior. Requirements: LINT-01, LINT-02, LINT-03, LINT-04, SLOP-01, SLOP-02, SLOP-03.
- [ ] **Phase 145: Type Safety Boundary Repair** — Replace production `as any` and double assertions with typed helpers, guards, or narrowed dispatcher boundaries, and add invalid-message/mount behavior coverage for touched shims. Requirements: TYPE-01, TYPE-02, TYPE-03, TYPE-04.
- [ ] **Phase 146: Complexity Hotspot Split** — Split the reported long functions and reduce oversized-file warnings where low-risk module boundaries exist; preserve normalizer fixtures, vite-plugin behavior, and NIPDB shim behavior. Requirements: QUAL-01, QUAL-02, QUAL-03, QUAL-04.
- [ ] **Phase 147: Final Quality Gate and Closeout** — Run the final scanner, workspace build, type-check, unit tests, and cleanup summary; record remaining risks or explicit deferrals. Requirements: GATE-01, GATE-02, GATE-03, GATE-04.

## Phase Details

### Phase 143: Dependency Security Upgrade

**Goal**: The root dependency graph resolves to patched versions for the reported vulnerable tooling dependencies while preserving the current Vite 6 compatibility path unless implementation evidence requires a major migration.
**Depends on**: Nothing.
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04

**Success Criteria** (what must be TRUE):
  1. `pnpm why vite`, `pnpm why postcss`, and `pnpm why turbo` show `vite >=6.4.2`, `postcss >=8.5.10`, and `turbo >=2.9.14`.
  2. `package.json` and `pnpm-lock.yaml` are the only required dependency graph edits unless a verification failure proves package-local changes are needed.
  3. The security scanner reports no vulnerable-dependency findings for `vite`, `postcss`, or `turbo`.
  4. `pnpm -r type-check`, `pnpm -r build`, and `pnpm -r test:unit` exit 0 after the dependency upgrade.

**Plans:** 1/1 plans

### Phase 144: Fixable Lint and Slop Cleanup

**Goal**: The scanner's fixable lint and AI-slop findings are removed with small mechanical edits: import hygiene, unused type removals, console diagnostic cleanup, duplicated shim logic collapse, and removal of decorative/trivial comments.
**Depends on**: Phase 143.
**Requirements**: LINT-01, LINT-02, LINT-03, LINT-04, SLOP-01, SLOP-02, SLOP-03

**Success Criteria** (what must be TRUE):
  1. Duplicate `@napplet/core` imports in `packages/nub/src/relay/types.ts` and `packages/shim/src/index.ts` are merged.
  2. The unused type imports named in the kickoff report are gone, with workspace type-check still green.
  3. Production source has no reported `console.log`, `console.debug`, or `console.info` leftovers; vite-plugin user-facing diagnostics are removed, converted to warnings/errors, or routed through an existing Vite hook surface.
  4. `packages/shim/src/index.ts` no longer has the duplicated logic block reported by the scanner.
  5. Decorative narrative comment blocks and trivial comments reported by the scanner are removed while preserving useful public API documentation and security rationale.

**Plans:** 0/? plans

### Phase 145: Type Safety Boundary Repair

**Goal**: Production shim and NUB code no longer depends on broad `as any` or double assertions where a local type guard, structural helper, or discriminated-union branch can express the boundary safely.
**Depends on**: Phase 144.
**Requirements**: TYPE-01, TYPE-02, TYPE-03, TYPE-04

**Success Criteria** (what must be TRUE):
  1. `window.napplet` and global mount code in production uses typed helpers or explicit structural types instead of broad `as any`.
  2. Message-handler double assertions are replaced by discriminated-union narrowing, small runtime guards, or a single isolated dispatcher-boundary adapter with verification evidence.
  3. Touched shims have invalid-message or mount-behavior tests proving rejected inputs stay rejected and valid inputs still update the same public surface.
  4. `pnpm -r type-check` exits 0 and the type-safety scanner categories from the kickoff report are closed or explicitly justified.

**Plans:** 0/? plans

### Phase 146: Complexity Hotspot Split

**Goal**: Reported complexity hotspots are split where doing so reduces real maintenance risk without public API drift, and any high-risk structural warning left behind receives an exact deferral note.
**Depends on**: Phase 145.
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04

**Success Criteria** (what must be TRUE):
  1. `normalizeConnectOrigin` is factored into focused helpers while preserving its 28-case smoke coverage and the canonical `connect:origins` aggregateHash fixture behavior.
  2. Long functions in `packages/shim/src/nipdb-shim.ts` and `packages/vite-plugin/src/index.ts` are split or narrowed with tests/build checks proving behavior preservation.
  3. Oversized type/barrel files are reduced where existing internal boundaries make the split low risk; public import paths remain compatible.
  4. Remaining file-size or function-length warnings, if any, are listed with exact reasons, owner files, and follow-up requirements instead of being left as silent debt.

**Plans:** 0/? plans

### Phase 147: Final Quality Gate and Closeout

**Goal**: The milestone finishes only after the scanner and workspace verification prove the cleanup, with a concise record of simplifications made and residual risk.
**Depends on**: Phases 143, 144, 145, 146.
**Requirements**: GATE-01, GATE-02, GATE-03, GATE-04

**Success Criteria** (what must be TRUE):
  1. The same scanner class used in the kickoff report reports zero security errors.
  2. Formatting, linting, code-quality, and AI-slop findings from the kickoff report are closed or explicitly deferred with rationale.
  3. `pnpm -r type-check`, `pnpm -r build`, and `pnpm -r test:unit` exit 0 after all cleanup edits.
  4. The final phase summary lists changed files, simplifications made, deleted code/comments, remaining risks, and verification evidence.

**Plans:** 0/? plans

<details>
<summary>✅ v0.30.0 Class-Gated Decrypt Surface (Phases 135-138) — SHIPPED 2026-04-23</summary>

**Milestone Goal:** Close the NIP-17 / NIP-59 gift-wrap receive-side gap by adding `identity.decrypt(event) → Rumor` to NUB-IDENTITY, gated shell-side to napplets assigned `class: 1` per NUB-CLASS-1. Plaintext decrypt is only safe where the posture guarantees zero direct network egress; NUB-CLASS-2 napplets (approved direct-origin access via NUB-CONNECT) MUST be refused at the shell boundary. Same milestone establishes shell-enforced detection of NIP-07 extension `window.nostr` injection via CSP `report-to`. All enforcement is shell-side; napplets are untrusted.

- [x] **Phase 135: First-Party Types + SDK Plumbing** — Ship `@napplet/nub/identity` type additions (`IdentityDecryptMessage` / `.result` / `.error` + `IdentityDecryptErrorCode` + `Rumor` + `NappletIdentity.decrypt` method type), shim handler + `decrypt()` binding, SDK `identityDecrypt()` helper + re-exports, and gate on `pnpm -r build` + `pnpm -r type-check` green across all 14 packages. Prove the tree-shake contract still holds. (verification found 2 gaps — plan 135-05 closes them) (completed 2026-04-23)
- [x] **Phase 136: Empirical CSP Injection-Block Verification** — Serve a test napplet under NUB-CLASS-1 posture (`connect-src 'none'`; `script-src 'nonce-XXX'`) with Playwright, simulate legacy `<script>`-tag content-script injection, and observe CSP blocking + `securitypolicyviolation` event firing. Document the `world: 'MAIN'` extension-API residual honestly. Locks the empirical shape of the DETECT-01..04 surface before the amendment PR cites it. (completed 2026-04-23)
- [x] **Phase 137: Public `napplet/nubs` Amendments (NUB-IDENTITY + NUB-CLASS-1 bundled)** — Draft the NUB-IDENTITY amendment adding `identity.decrypt` envelope triad with full conformance table (4 MUSTs: class-gating, outer-sig-verify, impersonation-check, outer-created_at-hiding), 8-code error vocabulary, class-gating cite of `NUB-CLASS-1.md` by filename, and Security Considerations subsection. Bundle the NUB-CLASS-1 amendment (`report-to` SHOULD + violation-correlation MUST) into the same PR per CLASS1-03's "bundle if review convenience prevails" clause. Public-repo hygiene verified: zero `@napplet/*`, zero `kehto`, zero `hyprgate` in diff/commits/PR body. (completed 2026-04-23)
- [x] **Phase 138: In-Repo NIP-5D Amendment + Docs + Final Verification** — Sync local `specs/NIP-5D.md` against `napplet/nubs` master post-PR-15; add Security Considerations subsection documenting NIP-07 `all_frames: true` injection vector, CSP nonce-based `script-src` mitigation for legacy injection, `world: 'MAIN'` residual, NUB-CLASS-1 `connect-src 'none'` as structural mitigation; cite `NUB-IDENTITY.md` and `NUB-CLASS-1.md` by filename. Update `packages/nub/README.md`, `packages/sdk/README.md`, root `README.md`, and `skills/build-napplet/SKILL.md` for the `identity.decrypt` surface. Run VER-06 grep gate. (completed 2026-04-23)

</details>

<details>
<summary>v0.2.0 Shell Architecture Cleanup (Phases 7-11) — SHIPPED 2026-03-31</summary>

- [x] **Phase 7: Nomenclature** - Rename PseudoRelay to ShellBridge across all packages
- [x] **Phase 8: ACL Pure Module** - Extract @napplet/acl as zero-dep pure module
- [x] **Phase 9: ACL Enforcement Gate** - Single enforce() gate in ShellBridge
- [x] **Phase 10: ACL Behavioral Tests** - Full capability x action matrix tests
- [x] **Phase 11: Shell Code Cleanup** - Verb-noun naming, JSDoc, clean internals

</details>

<details>
<summary>v0.3.0 Runtime and Core (Phases 12-17) — SHIPPED 2026-03-31</summary>

- [x] **Phase 12: Core Package** - Extract shared protocol types, constants, and message definitions into @napplet/core
- [x] **Phase 13: Runtime Package** - Extract protocol engine into @napplet/runtime
- [x] **Phase 14: Shell Adapter and Shim Rewire** - Slim shell to browser adapter over runtime; switch shim to core imports
- [x] **Phase 15: Service Extension Design** - Define RuntimeHooks.services interface and reserve kind 29010
- [x] **Phase 16: Verification** - Full test suite green with new structure
- [x] **Phase 17: Shell Export Cleanup** - Remove dead exports, deduplicate enforce, clean singletons

</details>

<details>
<summary>v0.4.0 Feature Negotiation & Service Discovery (Phases 18-22.1) — SHIPPED 2026-03-31</summary>

- [x] **Phase 18: Core Types & Runtime Dispatch** - ServiceDescriptor in core, ServiceHandler/ServiceRegistry in runtime, topic-prefix routing
- [x] **Phase 19: Service Discovery Protocol** - Kind 29010 REQ/EVENT/EOSE synthetic response flow
- [x] **Phase 20: Concrete Services** - @napplet/services package with audio and notification ServiceHandlers
- [x] **Phase 21: Shim Discovery API** - discoverServices(), hasService(), hasServiceVersion() on window.napplet global
- [x] **Phase 22: Negotiation & Compatibility** - Manifest requires tags, CompatibilityReport, strict/permissive mode, undeclared consent
- [x] **Phase 22.1: Core Infrastructure Services** (INSERTED) - Signer, relay pool, cache extracted as ServiceHandlers

</details>

<details>
<summary>v0.5.0 Documentation & Developer Skills (Phases 23-26) — SHIPPED 2026-04-01</summary>

- [x] **Phase 23: New Package READMEs** - Create READMEs for the four new packages: @napplet/acl, @napplet/core, @napplet/runtime, @napplet/services
- [x] **Phase 24: Root and Interface READMEs** - Update root README and existing package READMEs: shim, shell, vite-plugin to reflect v0.4.0 reality
- [x] **Phase 25: SPEC.md Updates** - Update SPEC.md Section 11, rename legacy identifiers, and document the requires/compat protocol
- [x] **Phase 26: Skills Directory** - Create agentskills.io-format skill files: build-napplet, integrate-shell, add-service

</details>

<details>
<summary>v0.6.0 Demo Upgrade (Phases 27-33) — SHIPPED 2026-04-01</summary>

- [x] **Phase 27: Demo Audit & Correctness** - Reconcile the demo with current packages, identify stale integrations, and verify whether observed failures are UI bugs or deeper protocol/runtime issues
- [x] **Phase 28: Architecture Topology View** - Separate shell, ACL, runtime, and service nodes into a flow that mirrors the actual host architecture
- [x] **Phase 29: Node Detail & Drill-Down** - Add node-specific status surfaces plus a right-side expanded panel that preserves the bottom debugger
- [x] **Phase 30: Notification Service UX** - Register notification service in the demo, surface it as a node, and drive toast UX through the real service path
- [x] **Phase 31: Signer Connection UX** - Replace the simplified signer demo with visible signer connection flows for NIP-07 and NIP-46, including configurable NIP-46 relay settings
- [x] **Phase 32: Fix Demo UI/UX Bugs** - Amber infrastructure-failure state, Leader Line SVG edges, ACL isAmber logic fix, signer error detection
- [x] **Phase 33: Polish Demo UI Layout** - Fix layout and interaction issues: iframe container filling, 90-degree line routing, endpoint offsets, orphan container lines, and service button click handling

</details>

<details>
<summary>v0.7.0 Ontology Audit and Adjustments (Phases 34-40) — SHIPPED 2026-04-02</summary>

- [x] **Phase 34: Terminology Rename** - Rename all napp* identifiers, types, topics, meta tags, localStorage prefix, and docs to napplet* across all 7 packages
- [x] **Phase 35: Wire Protocol Rename** - Rename BusKind.INTER_PANE to BusKind.IPC_PEER and update all 30+ call sites plus SPEC.md
- [x] **Phase 36: Type Correctness** - Consolidate ConsentRequest to runtime canonical definition and remove shell/state-proxy.ts dead code
- [x] **Phase 37: API Alignment** - Rename RuntimeHooks/ShellHooks to RuntimeAdapter/ShellAdapter with deprecated aliases for one release cycle
- [x] **Phase 38: Session Vocabulary** - Rename NappKeyEntry/NappKeyRegistry to SessionEntry/SessionRegistry
- [x] **Phase 39: Documentation Pass** - Document topic prefix direction semantics and mark nappStorage as deprecated
- [x] **Phase 40: Remaining Rename Gaps** - Close audit gaps: createEphemeralKeypair, vite-plugin nappletType, SPEC.md stale topic strings

</details>

<details>
<summary>v0.8.0 Shim/SDK Split (Phases 41-44) — SHIPPED 2026-04-02</summary>

- [x] **Phase 41: Shim Restructure** - Reorganize @napplet/shim into a pure window installer with namespaced window.napplet API and zero named exports
- [x] **Phase 42: SDK Package** - Create @napplet/sdk as a standalone bundler-friendly package wrapping window.napplet
- [x] **Phase 43: Demo & Test Migration** - Update demo napplets and test suite for new window.napplet API shape
- [x] **Phase 44: Documentation** - Update SPEC.md and READMEs for shim/SDK split

</details>

<details>
<summary>v0.9.0 Identity & Trust (Phases 46-48) — SHIPPED 2026-04-03</summary>

- [x] **Phase 46: Shell-Assigned Keypair Handshake** - REGISTER/IDENTITY/AUTH handshake, storage rekeying, aggregate hash verification, instance GUIDs, delegated key security (completed 2026-04-02)
- [x] **Phase 47: Deprecation Cleanup** - Remove RuntimeHooks and ShellHooks deprecated aliases (completed 2026-04-02)
- [x] **Phase 48: Specification & Documentation** - Update SPEC.md Sections 2, 5, and 14 for new handshake, storage, and security models (completed 2026-04-02)

</details>

<details>
<summary>v0.10.0 Demo Consistency and Usability Pass (Phases 49-53) — SHIPPED 2026-04-04</summary>

- [x] **Phase 49: Constants Panel** - Expose and edit protocol magic numbers in a dedicated UI panel (completed 2026-04-03)
- [x] **Phase 50: ACL Detail Panel** - Show per-napplet restrictions, capabilities, and rejection reasons with full event context (completed 2026-04-03)
- [x] **Phase 51: Accurate Color Routing** - Directional edge coloring and composite node colors reflecting actual pass/fail/warn state (completed 2026-04-03)
- [x] **Phase 52: Service & Capability Toggles** - Enable/disable services and toggle individual ACL capabilities with live-reload (completed 2026-04-03)
- [x] **Phase 53: Per-Message Trace Mode** - Animated hop-by-hop message trace through the topology graph (completed 2026-04-03)

</details>

<details>
<summary>v0.11.0 Clean up Side Panel (Phases 54-56) — SHIPPED 2026-04-05</summary>

- [x] **Phase 54: Data Layer** - Add role annotations and query methods to ConstantDef for downstream filtering (completed 2026-04-04)
- [x] **Phase 55: Tab Reorganization** - Split Kinds into a read-only tab, constrain Constants to editable values, and fix tab persistence (completed 2026-04-04)
- [x] **Phase 56: Contextual Filtering** - Filter constants by selected node role with show-all fallback and toggle (completed 2026-04-04)

</details>

<details>
<summary>v0.12.0 Spec Packaging (Phase 61) — SHIPPED 2026-04-06</summary>

- [x] **Phase 61: Spec Packaging** - Rename SPEC.md to RUNTIME-SPEC.md, finalize NIP-5D v2 format (completed 2026-04-05)

</details>

<details>
<summary>v0.13.0 Runtime Decoupling & Publish (Phases 62-67) — SHIPPED 2026-04-06</summary>

- [x] **Phase 62: Runtime Repo Scaffold** - Initialize separate runtime repo (completed 2026-04-06)
- [x] **Phase 63: Package Migration** - Copy source, rewrite imports, build and type-check green (completed 2026-04-06)
- [x] **Phase 64: Demo & Test Migration** - Demo playground and test suite migrated (completed 2026-04-06)
- [x] **Phase 65: Napplet Cleanup** - Remove extracted packages and demo, reconfigure for 4-package monorepo (completed 2026-04-06)
- [x] **Phase 66: Publish Pipeline & Release** - GitHub Actions CI/CD and npm publish for @napplet packages (completed 2026-04-06)
- [x] **Phase 67: Cross-Repo Wiring & Docs** - Update all READMEs (completed 2026-04-06)

</details>

<details>
<summary>v0.14.0 Repo Cleanup & Audit (Phases 68-69) — SHIPPED 2026-04-06</summary>

- [x] **Phase 68: Audit & Clean** - Remove dead code, stale docs, and leftover config (completed 2026-04-06)
- [x] **Phase 69: Migration Evaluation** - Assess remaining content (completed 2026-04-06)

</details>

<details>
<summary>v0.15.0 Protocol Simplification (Phases 70-73) — SHIPPED 2026-04-07</summary>

- [x] **Phase 70: Core Protocol Types** - Remove AUTH/handshake types and constants from @napplet/core (completed 2026-04-07)
- [x] **Phase 71: Shim Simplification** - Strip signing, keypair, AUTH from shim; drop nostr-tools (completed 2026-04-07)
- [x] **Phase 72: NIP-5D Update** - Rewrite NIP-5D for simplified wire protocol (completed 2026-04-07)
- [x] **Phase 73: SDK & README Update** - Update all READMEs for no-crypto API (completed 2026-04-07)

</details>

<details>
<summary>v0.16.0 Wire Format & NUB Architecture (Phases 74-79) — SHIPPED 2026-04-07</summary>

- [x] **Phase 74: NIP-5D Rewrite** - JSON envelope, transport+identity+manifest+NUB-negotiation only (completed 2026-04-07)
- [x] **Phase 75: Package Architecture** - Envelope-only core + packages/nubs/ scaffold (completed 2026-04-07)
- [x] **Phase 76: Core Envelope Types** - NUB dispatch infrastructure + 12 tests (completed 2026-04-07)
- [x] **Phase 77: NUB Module Scaffold** - 52 typed message definitions across 4 NUBs (completed 2026-04-07)
- [x] **Phase 78: Shim & SDK Integration** - JSON envelope wire format + NUB type re-exports (completed 2026-04-07)
- [x] **Phase 79: Documentation Update** - All READMEs updated (completed 2026-04-07)

</details>

<details>
<summary>v0.17.0 Capability Cleanup (Phases 80-82) — SHIPPED 2026-04-08</summary>

- [x] **Phase 80: Namespaced Capability Query** - shell.supports() accepts nub:/perm:/svc: prefixed strings with typed ShellSupports interface (completed 2026-04-08)
- [x] **Phase 81: Dead Code & Legacy Removal** - Delete discovery shim, services API, legacy re-exports, backward-compat fallbacks, and all associated types/tests (completed 2026-04-08)
- [x] **Phase 82: Documentation** - Update core/shim/sdk READMEs and NIP-5D to reflect cleanup (completed 2026-04-08)

</details>

<details>
<summary>v0.18.0 Spec Conformance Audit (Phases 83-86) — SHIPPED 2026-04-09</summary>

- [x] **Phase 83: Dead Code Removal** - Delete unreachable types, uncalled functions, and dead files across core and shim (completed 2026-04-08)
- [x] **Phase 84: Spec Gap Inventory** - Document every function, type, constant, and behavior not covered by NIP-5D or any NUB spec (completed 2026-04-08)
- [x] **Phase 85: Stale Documentation Fixes** - Fix incorrect references in READMEs, JSDoc, and NIP-5D (completed 2026-04-08)
- [x] **Phase 86: Decision Gate** - Present the complete gap inventory for drop-or-amend decisions (completed 2026-04-09)

</details>

<details>
<summary>v0.19.0 Spec Gap Drops (Phase 87) — SHIPPED 2026-04-09</summary>

- [x] **Phase 87: Spec Gap Code Drops** - Delete all unspecced types, constants, and topics from @napplet/core and verify clean build (completed 2026-04-09)

</details>

<details>
<summary>v0.20.0 Keys NUB (Phases 88-92) — SHIPPED 2026-04-09</summary>

- [x] **Phase 88: NUB Type Package** - Create @napplet/nub-keys with typed message definitions per NUB-KEYS spec (completed 2026-04-09)
- [x] **Phase 89: Core Integration** - Add 'keys' to NubDomain union and NappletGlobal type (completed 2026-04-09)
- [x] **Phase 90: Shim Implementation** - Replace keyboard-shim.ts with NUB-KEYS smart forwarding and action API (completed 2026-04-09)
- [x] **Phase 91: SDK Wrappers** - Add keys namespace to SDK with registerAction() convenience and NUB type re-exports (completed 2026-04-09)
- [x] **Phase 92: Documentation** - README for nub-keys, NIP-5D domain table update, core/shim/SDK README updates (completed 2026-04-09)

</details>

<details>
<summary>v0.21.0 NUB Modularization (Phases 93-95) — SHIPPED 2026-04-09</summary>

- [x] **Phase 93: NUB Package Refactor** - Move domain logic into all 5 NUB packages (shim installers + SDK helpers)
- [x] **Phase 94: Shim + SDK Thin Hosts** - Refactor shim/SDK to import from NUB packages, add named exports for cherry-picking
- [x] **Phase 95: Verification** - Build clean, API surface identical before and after

</details>

<details>
<summary>v0.22.0 Media NUB + Kill Services (Phases 96-100) — SHIPPED 2026-04-09</summary>

- [x] **Phase 96: Kill Services** - Remove svc: prefix, drop AUDIO_* TOPICS superseded by media NUB
- [x] **Phase 97: NUB-MEDIA Spec** - Draft NUB-MEDIA spec in nubs repo, PR to napplet/nubs
- [x] **Phase 98: NUB Media Package** - @napplet/nub-media with types, shim installer, SDK wrappers
- [x] **Phase 99: Core + Shim Integration** - Add 'media' to NubDomain, NappletGlobal, and shim entry point
- [x] **Phase 100: Documentation** - READMEs for nub-media, NIP-5D domain table update, core/shim/SDK docs

</details>

<details>
<summary>v0.23.0 Notify NUB (Phases 101-104) — SHIPPED 2026-04-09</summary>

- [x] **Phase 101: NUB-NOTIFY Spec** - Draft NUB-NOTIFY spec in nubs repo, PR to napplet/nubs
- [x] **Phase 102: NUB Notify Package** - @napplet/nub-notify with types, shim installer, SDK wrappers
- [x] **Phase 103: Core + Shim Integration** - Add 'notify' to NubDomain, NappletGlobal, and shim entry point
- [x] **Phase 104: Documentation** - READMEs for nub-notify, NIP-5D domain table update, core/shim/SDK docs

</details>

<details>
<summary>v0.24.0 Identity NUB + Kill NIP-07 (Phases 105-110) — SHIPPED 2026-04-09</summary>

- [x] **Phase 105: Kill NIP-07 + Signer** - Remove window.nostr, delete nub-signer, strip signer from core/shim/SDK
- [x] **Phase 106: NUB-IDENTITY Spec** - Draft NUB-IDENTITY spec in nubs repo, PR to napplet/nubs
- [x] **Phase 107: NUB Identity Package** - @napplet/nub-identity with types, shim installer, SDK wrappers
- [x] **Phase 108: Relay NUB Update** - Add publishEncrypted + shell-decrypts-incoming to relay NUB
- [x] **Phase 109: Core + Shim Integration** - Replace signer with identity in core/shim dispatch
- [x] **Phase 110: Documentation** - NIP-5D security rationale, nub-identity README, core/shim/SDK docs

</details>

<details>
<summary>v0.25.0 Config NUB (Phases 111-116) — SHIPPED 2026-04-17</summary>

- [x] **Phase 111: NUB-CONFIG Spec** - Draft NUB-CONFIG spec in public nubs repo (PR #13)
- [x] **Phase 112: NUB Config Package Scaffold** - @napplet/nub-config types + config + barrel
- [x] **Phase 113: NUB Config Shim + SDK** - Installer + ref-counted subscribers + SDK wrappers
- [x] **Phase 114: Vite-Plugin Extension** - configSchema option + discovery + manifest tag + aggregateHash + meta injection + guards
- [x] **Phase 115: Core / Shim / SDK Integration + Wire** - 'config' in NubDomain + NappletGlobal.config + shim mount + SDK re-exports
- [x] **Phase 116: Documentation** - nub-config README + NIP-5D registry row + 4 package READMEs

</details>

<details>
<summary>v0.26.0 Better Packages (Phases 117-121) — SHIPPED 2026-04-19</summary>

- [x] **Phase 117: @napplet/nub Package Foundation** - Scaffold packages/nub/ with 34 subpath entry points + sideEffects:false
- [x] **Phase 118: Deprecation Re-Export Shims** - 9 deprecated packages become 1-line re-exports with [DEPRECATED] metadata
- [x] **Phase 119: Internal Consumer Migration** - shim + sdk migrated to @napplet/nub/<domain> paths
- [x] **Phase 120: Documentation Update** - New @napplet/nub README + 4 updated package READMEs + spec/skills sweep
- [x] **Phase 121: Verification & Sign-Off** - Monorepo build/type-check green + tree-shake bundle (39 bytes) + 9 pinned-consumer smokes green

</details>

<details>
<summary>v0.27.0 IFC Terminology Lock-In (Phases 122-124) — SHIPPED 2026-04-19</summary>

- [x] **Phase 122: Source Rename** - Break `window.napplet.ipc` → `.ifc`, rename SDK `ipc` export → `ifc`, sweep core + nub/ifc JSDoc
- [x] **Phase 123: Documentation Sweep** - Purge IPC / inter-pane from 4 READMEs + skill + active planning docs
- [x] **Phase 124: Verification & Sign-Off** - Monorepo build + type-check green; first-party zero-grep clean

</details>

<details>
<summary>v0.28.0 Browser-Enforced Resource Isolation (Phases 125-134) — SHIPPED 2026-04-21</summary>

- [x] **Phase 125: Core Type Surface** - Add `'resource'` to `NubDomain` + `NUB_DOMAINS`, add `resource` namespace to `NappletGlobal`, document `perm:strict-csp` (completed 2026-04-20)
- [x] **Phase 126: Resource NUB Scaffold + `data:` Scheme** - Create `packages/nub/src/resource/` triad, ship `data:` scheme decoded in-shim, single-flight cache, AbortSignal cancellation, blob URL lifecycle (completed 2026-04-20)
- [x] **Phase 127: NUB-RELAY Sidecar Amendment** - Optional `resources?: ResourceSidecarEntry[]` on `RelayEventMessage`; relay shim hydrates resource cache before `onEvent` (completed 2026-04-20)
- [x] **Phase 128: Central Shim Integration** - Wire resource NUB into `@napplet/shim`; mount `window.napplet.resource`; `nub:resource` and `resource:scheme:<name>` capability checks (completed 2026-04-20; closes DEF-125-01)
- [x] **Phase 129: Central SDK Integration** - Add `resource` namespace + `RESOURCE_DOMAIN` const + 11 type re-exports to `@napplet/sdk` (completed 2026-04-20)
- [x] **Phase 130: Vite-Plugin Strict CSP** - `strictCsp` option with first-`<head>`-child meta injection, header-only directive rejection, dev/prod split, nonce-based scripts, 10-directive baseline; ships `perm:strict-csp` (completed 2026-04-20)
- [x] **Phase 131: NIP-5D In-Repo Spec Amendment** - Browser-Enforced Resource Isolation subsection added to `specs/NIP-5D.md` (completed 2026-04-20)
- [x] **Phase 132: Cross-Repo Nubs PRs** - 4 draft specs at `.planning/phases/132/drafts/`: NUB-RESOURCE (new), NUB-RELAY sidecar with default-OFF privacy, NUB-IDENTITY/MEDIA clarifications; manual cross-repo PR opening deferred (completed 2026-04-20)
- [x] **Phase 133: Documentation + Demo Coordination** - 5 READMEs + skill + `specs/SHELL-RESOURCE-POLICY.md` + PROJECT.md/NUB-RESOURCE coordination notes delegating demos to downstream shell repo (completed 2026-04-20)
- [x] **Phase 134: Verification & Milestone Close** - All 7 VER gates green; NUB-RESOURCE.md spec/impl drift resolved (19 substitutions); milestone audit passed 65/65 (completed 2026-04-21)

</details>

<details>
<summary>v0.29.0 NUB-CONNECT + Shell as CSP Authority (Phases 135-142) — SHIPPED 2026-04-21</summary>

- [x] **Phase 135: Cross-Repo Spec Work** - Draft NUB-CONNECT + NUB-CLASS + NUB-CLASS-1 + NUB-CLASS-2 in napplet/nubs public repo; amend in-repo NIP-5D to NUB-neutral transport-only (completed 2026-04-21)
- [x] **Phase 136: Core Type Surface** - Add `'connect'` + `'class'` to `NubDomain` + `NUB_DOMAINS`; add `connect` + optional `class?: number` to `NappletGlobal`; deprecate `perm:strict-csp` in JSDoc (completed 2026-04-21)
- [x] **Phase 137: `@napplet/nub/connect` + `@napplet/nub/class` Subpath Scaffolds** - 4-file subpath for each; connect ships shared `normalizeConnectOrigin()`; class ships `ClassAssignedMessage` wire type + `installClassShim` dispatcher handler; 8 new subpath exports; tree-shake contract proven (completed 2026-04-21)
- [x] **Phase 138: `@napplet/vite-plugin` Surgery** - Drop production strictCsp machinery; add `connect?: string[]` option with normalizer, aggregateHash fold, manifest tag emission, fail-loud inline-script diagnostic, module-load conformance-fixture self-check (completed 2026-04-21)
- [x] **Phase 139: Central Shim + SDK Integration** - Wire `installConnectShim` + `installClassShim` into `@napplet/shim`; mount `window.napplet.connect` (default `{granted: false, origins: []}`) + `window.napplet.class` (default `undefined`); re-export both SDK surfaces (completed 2026-04-21)
- [x] **Phase 140: Shell-Deployer Policy Docs** - Author `specs/SHELL-CONNECT-POLICY.md` + `specs/SHELL-CLASS-POLICY.md` (class-determination authority, wire timing, cross-NUB invariants, revocation UX) (completed 2026-04-21)
- [x] **Phase 141: Documentation Sweep** - Root README + 4 package READMEs + SKILL.md for two-class posture, connect API, NUB-RESOURCE-first guidance; vite-plugin README rewrite (completed 2026-04-21)
- [x] **Phase 142: Verification & Milestone Close** - `pnpm -r build` + `type-check` green across 14 packages; 54 new vitest tests; 3 documented Playwright fixtures; cross-repo zero-grep clean; changeset authored; milestone audit passed 76/76 (completed 2026-04-21)

</details>


## v0.30.0 Phase Details


<details>
<summary>v0.30.0 phase details (archived — see milestones/v0.30.0-ROADMAP.md for canonical)</summary>

### Phase 135: First-Party Types + SDK Plumbing
**Goal**: The `@napplet/nub/identity` package ships the complete wire + SDK surface for `identity.decrypt` — type additions, shim handler, SDK helper, and central re-exports — so the public amendment PR in Phase 137 can cite a shipped (not hypothetical) first-party surface. Workspace type-check stays green and the identity-types-only tree-shake contract is preserved.
**Depends on**: Nothing (first phase of milestone; v0.28.0 Phase 134 shipped)
**Requirements**: TYPES-01, TYPES-02, TYPES-03, TYPES-04, TYPES-05, TYPES-06, SHIM-01, SHIM-02, SHIM-03, SDK-01, SDK-02, VER-01, VER-05
**Success Criteria** (what must be TRUE):
  1. `import { type IdentityDecryptMessage, type IdentityDecryptResultMessage, type IdentityDecryptErrorMessage, type IdentityDecryptErrorCode, type Rumor } from '@napplet/nub/identity'` resolves; the existing `IdentityMessage` / `IdentityInbound` / `IdentityOutbound` discriminated unions include the 3 new message types, and a `never`-fallback assertion in the shim handler enforces exhaustiveness at compile time.
  2. After `import '@napplet/shim'` (assuming SHIM-03 requires no central-shim edit — verified empirically during the phase), calling `window.napplet.identity.decrypt(event)` returns a `Promise<{ rumor: Rumor, sender: string }>` that resolves on `identity.decrypt.result` envelopes and rejects with a typed `IdentityDecryptError` on `identity.decrypt.error`; pending-request correlation by `id` cleans up on both paths.
  3. `import { identityDecrypt } from '@napplet/sdk'` resolves the bare-name helper wrapping `window.napplet.identity.decrypt` with a `requireNapplet()` guard; `@napplet/sdk` re-exports the 3 new identity types via the 4-surgical-edit pattern (namespace, type re-exports, DOMAIN const unchanged, helper re-export).
  4. `pnpm -r build` and `pnpm -r type-check` exit 0 across all 14 workspace packages (VER-01 shipping gate).
  5. A consumer importing only `@napplet/nub/identity/types` produces a tree-shaken bundle that does NOT pull shim/sdk runtime symbols, and the relay-types-only tree-shake bundle remains ≤ 100 bytes (matching v0.28.0 VER-07 74-byte precedent).
**Plans:** 5/5 plans complete
- [x] 135-01-PLAN.md — Types in @napplet/core + @napplet/nub/identity (TYPES-01..05)
- [x] 135-02-PLAN.md — Shim runtime (decrypt function + handler branch) + central shim mount (SHIM-01..03)
- [x] 135-03-PLAN.md — SDK identityDecrypt helper + central SDK 4-surgical-edits (SDK-01..02)
- [x] 135-04-PLAN.md — Verification: workspace build+type-check + identity-types-only tree-shake (TYPES-06, VER-01, VER-05)
- [x] 135-05-PLAN.md — Gap closure: Rumor re-export from @napplet/nub/identity + never-fallback exhaustiveness in shim handler (TYPES-01, TYPES-03, TYPES-05)

### Phase 136: Empirical CSP Injection-Block Verification
**Goal**: Empirically prove on Chromium that a test napplet served under the NUB-CLASS-1 CSP posture (`connect-src 'none'`; `script-src 'nonce-XXX'`; `report-to` directive) blocks a simulated legacy `<script>`-tag content-script injection AND fires a `securitypolicyviolation` event the shell can receive. Lock the observed-shape of `world: 'MAIN'` extension-API residual honestly (no browser-layer block possible from page side). The empirical result backs DETECT-01..04's spec language in Phase 137's amendment — the PR cites behavior we've actually observed, not assumed.
**Depends on**: Nothing (independent of Phase 135; empirical fixture only)
**Requirements**: DETECT-01, DETECT-02, DETECT-03, DETECT-04, VER-04
**Success Criteria** (what must be TRUE):
  1. A Playwright fixture serves a napplet HTML page under the NUB-CLASS-1 CSP baseline (`default-src 'none'`, `connect-src 'none'`, `script-src 'nonce-XXX' 'self'`, `report-to <shell-owned-endpoint>`) with matching `Report-To` response header; mock-injects a legacy `<script>` tag without the valid nonce; observes Chromium blocking the injection with a CSP-violation console message AND firing a `securitypolicyviolation` event whose `violatedDirective` is `script-src`.
  2. The same fixture records the shape of the violation report that would be POSTed to the `report-to` endpoint (directive, blocked URI, document URL, source file); the observed shape is documented as the input the shell MUST process per DETECT-02, correlating to napplet identity via `(dTag, aggregateHash)` through the napplet HTML URL path.
  3. The `world: 'MAIN'` extension-API residual is documented honestly in the phase artifact: extensions using `chrome.scripting.executeScript({world:'MAIN'})` bypass page CSP entirely → no `securitypolicyviolation` fires → no report to the shell. The structural mitigation is NUB-CLASS-1's `connect-src 'none'` trapping any plaintext inside the frame regardless of how it was obtained.
  4. The phase artifact names the shell's policy latitude explicitly: shell MAY (not MUST) refuse-to-serve subsequent loads of an offending napplet, reject subsequent `identity.decrypt` envelopes from it, or surface the event to the user — spec defines the mechanism, not the response (DETECT-03).
**Plans:** 2/2 plans complete
- [x] 136-01-PLAN.md — Playwright CJS fixture: empirical CSP legacy-injection block + violation-report shape capture (DETECT-01, VER-04)
- [x] 136-02-PLAN.md — Synthesize 136-PHASE-NOTES.md from Plan 01 evidence + DETECT-02/03/04 documentation gates (DETECT-02, DETECT-03, DETECT-04)

### Phase 137: Public `napplet/nubs` Amendments (NUB-IDENTITY + NUB-CLASS-1 bundled)
**Goal**: A single draft PR on public `napplet/nubs` amends `NUB-IDENTITY.md` with the `identity.decrypt` envelope triad (request + result + error) plus Security Considerations, AND amends `NUB-CLASS-1.md` with the `report-to` SHOULD row and violation-correlation MUST. The PR is opened by the human; this milestone authors the diff. Public-repo hygiene is verified clean: zero `@napplet/*`, zero `kehto`, zero `hyprgate` in diff, commit messages, or PR body. Filename citations (`NUB-CLASS-1.md`) replace abstract phrases (`Class 1`) as primary references per NUB-CLASS §Citation.
**Depends on**: Phase 135 (shipped first-party surface to cite honestly), Phase 136 (empirical `securitypolicyviolation` shape observed on Chromium)
**Requirements**: DEC-01, DEC-02, DEC-03, DEC-04, DEC-05, DEC-06, DEC-07, DEC-08, GATE-01, GATE-02, GATE-03, GATE-04, NUB-IDENTITY-01, NUB-IDENTITY-02, NUB-IDENTITY-03, NUB-IDENTITY-04, NUB-IDENTITY-05, NUB-IDENTITY-06, NUB-IDENTITY-07, CLASS1-01, CLASS1-02, CLASS1-03, VER-02, VER-03
**Success Criteria** (what must be TRUE):
  1. The NUB-IDENTITY amendment draft at `~/Develop/nubs/` contains the `identity.decrypt` / `.result` / `.error` envelope triad with full payload shapes (DEC-01..03), the 8-code `IdentityDecryptErrorCode` vocabulary enumerated with a one-sentence failure-surface description per code (DEC-04, NUB-IDENTITY-03), the shape-auto-detection clause covering NIP-04 / direct NIP-44 / NIP-17 gift-wrap (DEC-05), and the 4 shell MUSTs — class-gating, outer-sig-verify, impersonation-check (seal.pubkey === rumor.pubkey), outer-created_at-hiding (DEC-06..08, GATE-01..03, NUB-IDENTITY-02).
  2. The amendment enforces filename citation discipline: `NUB-CLASS-1.md` appears at least once as a primary reference; prose says "napplets assigned `class: 1`" or "NUB-CLASS-1 napplets"; the abstract phrase "Class 1" does NOT appear as a primary reference (NUB-IDENTITY-04; grep-verifiable per VER-03).
  3. The amendment's Security Considerations subsection names three distinct concerns: (a) the NIP-17/59 gift-wrap flow and the spec MUSTs that prevent impersonation; (b) NIP-07 extension `all_frames: true` content-script injection + the fact that NUB-CLASS-1 strict-CSP nonce-based `script-src` blocks legacy `<script>` injection; (c) the `world: 'MAIN'` extension-API residual with NUB-CLASS-1 `connect-src 'none'` as structural mitigation (NUB-IDENTITY-05).
  4. The NUB-CLASS-1 amendment is bundled into the same PR per CLASS1-03's "bundle if review convenience prevails" clause: a Shell Responsibilities SHOULD row adds `report-to` / `Report-To` alongside the `connect-src 'none'` baseline (CLASS1-01); a MUST row requires the shell to process received violation reports by correlating to napplet identity via `(dTag, aggregateHash)` (CLASS1-02, DETECT-02 reference).
  5. Cross-repo public-hygiene grep is clean across the amendment diff, commit messages, and PR description: zero matches for `@napplet/*`, zero matches for `kehto`, zero matches for `hyprgate` (NUB-IDENTITY-06, VER-02; matches v0.28.0 VER-06 pattern).
  6. The shim-side defense-in-depth behavior is documented in the amendment as OBSERVABILITY not trust boundary: shell still enforces `class-forbidden` authoritatively per GATE-01..03 regardless of whether the shim short-circuits locally (GATE-04).
  7. The PR is branched from the existing `nub-identity` branch as `nub-identity-decrypt` (or similar); per in-repo convention, the user opens the PR — this phase's ship gate is "diff authored and hygiene-clean on branch" (NUB-IDENTITY-07, CLASS1-03).
**Plans:** 4/4 plans complete
- [x] 137-01-PLAN.md — Branch setup: create nub-identity-decrypt from nub-identity + merge nub-class-1 (NUB-IDENTITY-07, CLASS1-03)
- [x] 137-02-PLAN.md — NUB-CLASS-1 amendment: report-to SHOULD + violation-correlation MUST + Security Considerations subsection (CLASS1-01, CLASS1-02)
- [x] 137-03-PLAN.md — NUB-IDENTITY amendment: identity.decrypt envelope triad + error vocabulary + 4 shell MUSTs + Security Considerations (DEC-01..08, GATE-01..04, NUB-IDENTITY-01..05)
- [x] 137-04-PLAN.md — Verification: VER-02 hygiene grep + VER-03 conformance grep + 137-PHASE-NOTES.md synthesis (NUB-IDENTITY-06, NUB-IDENTITY-07, VER-02, VER-03)

### Phase 138: In-Repo NIP-5D Amendment + Docs + Final Verification
**Goal**: Sync local `specs/NIP-5D.md` against `napplet/nubs` master post-PR-15 (`window.nostr` removal merged 2026-04-21), then layer the v0.30.0 NIP-07 Security Considerations subsection referencing the Phase 137 amendment. Update package READMEs + root README + napplet-author skill for the `identity.decrypt` surface. Run the final VER-06 grep gate. Spec branch hygiene observed per `feedback_spec_branch_hygiene`: in-repo `specs/NIP-5D.md` changes land on master (or their own PR) — never bundled into a NUB-WORD branch.
**Depends on**: Phase 135 (SDK surface to document), Phase 137 (amendment drafts to cite by filename)
**Requirements**: NIP5D-01, NIP5D-02, NIP5D-03, NIP5D-04, DOC-01, DOC-02, DOC-03, DOC-04, VER-06
**Success Criteria** (what must be TRUE):
  1. Local `specs/NIP-5D.md` is synced against `napplet/nubs` master post-PR-15: any stale prose about `window.nostr` or napplet-performed encryption that drifted before the 2026-04-21 merge is reconciled before the v0.30.0 amendment layers on top (NIP5D-01).
  2. `specs/NIP-5D.md` Security Considerations gains a NIP-07 subsection naming: the `all_frames: true` content-script injection vector; CSP nonce-based `script-src` as the mitigation for legacy `<script>` injection; the `world: 'MAIN'` extension-API residual documented honestly (no page-side block); NUB-CLASS-1 `connect-src 'none'` as the structural mitigation trapping plaintext inside the frame; `identity.decrypt` on NUB-IDENTITY as the spec-legal receive-side decrypt path for NUB-CLASS-1 napplets (NIP5D-02).
  3. Cross-references cite `NUB-IDENTITY.md` and `NUB-CLASS-1.md` by filename (per NUB-CLASS §Citation); the NIP-5D amendment commit is independent of the Phase 137 cross-repo PR diff (NIP5D-03, NIP5D-04).
  4. `packages/nub/README.md` documents `identity.decrypt()` under the identity NUB section (API shape, class-gating expectation, error handling, NIP-17 auto-detect behavior); `packages/sdk/README.md` adds an `identityDecrypt()` entry alongside existing identity SDK helpers; root `README.md` gains a one-line v0.30.0 changelog bullet; `skills/build-napplet/SKILL.md` is updated with a one-paragraph guidance block: NIP-17 DM / kind-1059 handling uses `window.napplet.identity.decrypt(event)`; requires NUB-CLASS-1; napplets MUST NOT attempt `window.nostr.*` decrypt; shell enforces (DOC-01..04).
  5. VER-06 grep gate: `specs/NIP-5D.md` NIP-07 Security Considerations subsection is present, non-empty, cites both `NUB-IDENTITY.md` and `NUB-CLASS-1.md` by filename, and names the `world: 'MAIN'` residual honestly (grep-verifiable).
**Plans:** 2/2 plans complete
- [x] 138-01-PLAN.md — NIP-5D sync verification + NIP-07 Extension Injection Residual subsection + VER-06 grep gate (NIP5D-01..04, VER-06)
- [x] 138-02-PLAN.md — Docs sweep across 4 surfaces: packages/nub README, packages/sdk README, root README, skills/build-napplet SKILL.md (DOC-01..04)

</details>

## Progress

**Execution Order:**
Phase 135 and Phase 136 are independent and MAY execute in parallel (Phase 135 ships first-party types/SDK; Phase 136 runs an empirical Playwright fixture — no shared artifact). Phase 137 blocks on BOTH (amendment cites the shipped surface from 135 and the observed CSP-block shape from 136). Phase 138 blocks on 135 (SDK surface to document) and 137 (amendment drafts to cite by filename). All v0.30.0 enforcement invariants (shell-side enforcement, filename citation discipline, public-repo hygiene) are cross-phase invariants and NOT optional per-phase add-ons.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 135. First-Party Types + SDK Plumbing | 5/5 | Complete    | 2026-04-23 |
| 136. Empirical CSP Injection-Block Verification | 2/2 | Complete    | 2026-04-23 |
| 137. Public `napplet/nubs` Amendments (NUB-IDENTITY + NUB-CLASS-1 bundled) | 4/4 | Complete    | 2026-04-23 |
| 138. In-Repo NIP-5D Amendment + Docs + Final Verification | 2/2 | Complete    | 2026-04-23 |
