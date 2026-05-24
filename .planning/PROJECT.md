# Napplet Protocol SDK

## Shipped: v0.29.0 NUB-CONNECT + Shell as CSP Authority

Shifted strict CSP emission from the vite-plugin (build time) to the host shell (runtime) for every napplet, and introduced two new NUBs: NUB-CLASS (shell-authoritative abstract security posture via `class.assigned` wire, `window.napplet.class: number | undefined`, sub-track of `NUB-CLASS-$N` documents) and NUB-CONNECT (user-gated direct network access declared via `["connect", "<origin>"]` manifest tags, no postMessage wire protocol — grants flow through the runtime CSP the shell serves in the HTTP response plus a `<meta name="napplet-connect-granted">` tag read synchronously at shim install time, `window.napplet.connect.{granted, origins}`). Shared `normalizeConnectOrigin()` validator (21 rule violations enumerated, 28/28 smoke tests pass) is single source of truth for build-side and shell-side origin validation; canonical `connect:origins` aggregateHash fold (lowercase → ASCII-sort → LF-join → UTF-8 → SHA-256 → lowercase hex) is byte-locked to a 3-origin conformance fixture with independently verified digest `cc7c1b1903fb23ecb909d2427e1dccd7d398a5c63dd65160edb0bb8b231aa742`. `@napplet/vite-plugin` strict-CSP production path removed (accept-but-warn `strictCsp` shim retained for one release cycle; hard-removal tracked as REMOVE-STRICTCSP for a future milestone (originally scheduled v0.30.0, but v0.30.0 shipped Class-Gated Decrypt instead — see milestones/v0.30.0-ROADMAP.md)); `connect?: string[]` option added with manifest tag emission + aggregateHash fold + fail-loud inline-script diagnostic + dev-mode-only `napplet-connect-requires` meta; module-load self-check binds the plugin's fold to the spec conformance fixture at ESM-init. `@napplet/shim` + `@napplet/sdk` mount both NUB surfaces with graceful-degradation defaults (`connect` → `{granted: false, origins: []}`, `class` → `undefined`) and the central dispatcher routes `class.*` envelopes. 4 draft specs authored in `napplet/nubs` public repo (NUB-CONNECT, NUB-CLASS, NUB-CLASS-1, NUB-CLASS-2); NIP-5D amended to become NUB-neutral transport-only; `specs/SHELL-CONNECT-POLICY.md` + `specs/SHELL-CLASS-POLICY.md` shell-deployer checklists authored. Acceptance gates (13 VER-IDs total): `pnpm -r build` + `pnpm -r type-check` green across 14 packages; tree-shake harness extended with connect + class types-only consumer cases (zero forbidden symbols, within 500 B budget); 4 in-repo vitest suites (connect+class shim, aggregateHash conformance fixture, cross-NUB invariant table-driven across 7 SHELL-CLASS-POLICY scenarios); 3 documented Playwright fixtures exportable to downstream shell repo (approved-grant positive path, denied-grant negative path, residual-meta-CSP refusal contrast); cross-repo zero-grep clean across 4 drafts; changeset authored; downstream-shell tracking doc-check passed. Demo napplets delegated to downstream shell repo (Option B carried forward from v0.28.0). 8 phases, 19 plans shipped 2026-04-21. See [archive](milestones/v0.29.0-ROADMAP.md).

## Shipped: v0.30.0 Class-Gated Decrypt Surface

Added `identity.decrypt(event) → Promise<{ rumor, sender }>` on NUB-IDENTITY — shell-mediated NIP-04 / direct NIP-44 / NIP-17 gift-wrap auto-detect decrypt. Gated shell-side to napplets assigned `class: 1` per NUB-CLASS-1 (strict baseline posture, `connect-src 'none'`); NUB-CLASS-2 napplets receive `class-forbidden` error because plaintext could exfiltrate to user-approved origins with zero shell visibility. 8-code `IdentityDecryptErrorCode` vocabulary (`class-forbidden`, `signer-denied`, `signer-unavailable`, `decrypt-failed`, `malformed-wrap`, `impersonation`, `unsupported-encryption`, `policy-denied`). 4 shell MUSTs: class-gating, outer-sig-verify, impersonation-check (seal.pubkey === rumor.pubkey), outer-`created_at` hiding (NIP-59 ±2-day randomization privacy floor). `Rumor = UnsignedEvent & { id: string }` (nostr-tools canonical). Shell-enforced NIP-07 extension `window.nostr` injection detection via CSP `report-to` correlated to `(dTag, aggregateHash)` — empirically proven on Chromium 144+ (`violatedDirective: "script-src-elem"`); `world: 'MAIN'` extension-API bypass documented as honest residual with NUB-CLASS-1's `connect-src 'none'` as structural mitigation. 4 phases, 13 plans (one Rule 3 gap-closure iteration), 33 tasks shipped 2026-04-23. Cross-repo NUB-IDENTITY + NUB-CLASS-1 amendment authored on napplet/nubs branch `nub-identity-decrypt` (human opens PR). In-repo NIP-5D `### NIP-07 Extension Injection Residual` subsection layered. See [archive](milestones/v0.30.0-ROADMAP.md).

## Shipped: v0.28.0 Browser-Enforced Resource Isolation

Converted napplet iframe security from ambient trust to browser-enforced isolation. Single new NUB (`resource`) with `resource.bytes(url) → Blob` primitive, scheme-pluggable URL space (4 canonical schemes: `https:`, `blossom:`, `nostr:`, `data:`). `data:` decoded inline (zero shell round-trip); other schemes route via `postMessage` envelopes through the host shell. Single-flight cache (N concurrent same-URL calls share 1 fetch), AbortSignal cancellation with `resource.cancel` envelope, `bytesAsObjectURL(url)` lifecycle helper. Optional sidecar pre-resolution on `relay.event` envelopes (`resources?: ResourceSidecarEntry[]`) with default-OFF privacy posture per NUB-RELAY amendment. Strict CSP enforcement at the iframe boundary via `@napplet/vite-plugin` `strictCsp` option: 10-directive baseline, first-`<head>`-child meta injection, header-only directive rejection, dev/prod connect-src split, nonce-based scripts. NIP-5D Security Considerations subsection added in-repo; 4 cross-repo draft PRs authored for `napplet/nubs` (NUB-RESOURCE new spec; NUB-RELAY/IDENTITY/MEDIA amendments). Acceptance gates: `pnpm -r build` + `pnpm -r type-check` green across all 14 packages; CSP positive-blocking Playwright simulation; single-flight stampede against built dist; sidecar default-OFF + SVG-bomb spec conformance; cross-repo zero-grep clean; tree-shake bundle (zero resource-shim symbols in relay-types-only consumer). Demo napplets explicitly delegated to downstream shell repo (Option B). 10 phases, 10 plans shipped 2026-04-23. See [archive](milestones/v0.28.0-ROADMAP.md).

## Shipped: v0.27.0 IFC Terminology Lock-In

Completed the `ipc` → `ifc` rename end-to-end. Hard break with no backward-compat alias: `window.napplet.ipc` renamed to `window.napplet.ifc` in `@napplet/core`, `@napplet/shim`, `@napplet/sdk`, and `@napplet/nub/ifc`; the `@napplet/sdk` `ipc` named export deleted and replaced with `ifc`; every JSDoc / section comment updated to `IFC-PEER` / "inter-frame" phrasing. Public docs aligned: root README + four package READMEs + `skills/build-napplet/SKILL.md` + active `.planning/` docs swept to IFC terminology with historical changelog bullets preserved as records. Acceptance gate passed: `pnpm -r build` + `pnpm -r type-check` green across all 14 workspace packages; first-party-surface zero-grep across `packages/`, `specs/`, `skills/`, root README, and `.planning/codebase/` returns zero matches (with one documented `INTEGRATIONS.md:168` `INTER_PANE` historical-constant exception). 3 phases, 5 plans shipped 2026-04-19. See [archive](milestones/v0.27.0-ROADMAP.md).

## Shipped: v0.26.0 Better Packages

Consolidated the 9 separate `@napplet/nub-<domain>` packages into a single tree-shakable `@napplet/nub` with 34 subpath entry points (9 barrel + 9 types + 8 shim + 8 sdk — theme is types-only). The 9 old packages became 1-line `export * from '@napplet/nub/<domain>'` re-export shims with `[DEPRECATED]` metadata + README banners (one-release deprecation cycle; removal deferred to a future milestone via `REMOVE-01..03`). `@napplet/shim` migrated to `/shim` granular subpaths; `@napplet/sdk` migrated to `/<domain>` barrels; 0 `@napplet/nub-` specifiers remain in first-party source. Root + 4 package READMEs rewritten; defunct `@napplet/nub-signer` references purged. Tree-shaking contract proven (39-byte bundle for types-only consumer, 0 `registerNub`, 0 cross-domain leakage). 5 phases, 12 plans shipped 2026-04-19. See [archive](milestones/v0.26.0-ROADMAP.md).

## What This Is

A portable SDK for the napplet protocol — sandboxed Nostr mini-apps that run in restrictive iframes and delegate functionality (signing, storage, relay access) to a host shell via JSON envelope postMessage wire format defined by NIP-5D.

## Core Value

Prove that sandboxed Nostr apps can securely delegate to a host shell over a simple, standardized protocol — and ship the spec + SDK so others can build on it.

## Current Milestone: v0.31.0 Cleanup Quality Gate

**Goal:** Turn the current `aislop` security, lint, type-safety, and code-quality findings into a green, behavior-preserving quality gate.

**Target features:**
- Upgrade vulnerable tooling dependencies (`vite`, transitive `postcss`, `turbo`) without changing package runtime behavior.
- Remove fixable lint and AI-slop findings: duplicate imports, unused imports, decorative/trivial comments, leftover `console.log` diagnostics, and duplicated shim logic.
- Reduce unsafe type assertions and oversized hotspots with tests or existing behavior checks protecting public NUB, shim, SDK, and vite-plugin surfaces.

## Shipped: v0.25.0 Config NUB

NUB-CONFIG spec (napplet/nubs#13) for per-napplet declarative configuration. `@napplet/nub-config` (9th NUB, 13th package) with 8 wire message types (registerSchema, get, subscribe, unsubscribe, openSettings, values, registerSchema.result, schemaError). JSON Schema draft-07 Core Subset (`pattern` excluded per CVE-2025-69873). Shell is sole writer; subscribe-live value delivery with ref-counted subscribers. Vite-plugin extension: `configSchema` option with 3-path discovery (inline / config.schema.json / napplet.config.ts), `['config', ...]` manifest tag, `config:schema` synthetic aggregateHash prefix, `<meta name="napplet-config-schema">` injection, build-time structural guards. `x-napplet-secret`/`-section`/`-order` + `deprecationMessage` + `markdownDescription` as potentialities. FromSchema type inference via json-schema-to-ts optional peer. All docs updated. 6 phases shipped 2026-04-17. See [archive](milestones/v0.25.0-ROADMAP.md).

## Shipped: v0.24.0 Identity NUB + Kill NIP-07

Removed `window.nostr` (NIP-07) from napplets — napplets can no longer sign or encrypt. Deleted `@napplet/nub-signer` entirely. Created `@napplet/nub-identity` (read-only user queries: getPublicKey, getRelays, getProfile, getFollows, getList, getZaps, getMutes, getBlocked, getBadges). Added `relay.publishEncrypted` for shell-mediated crypto (NIP-44 default). Shell auto-decrypts incoming encrypted events. NIP-5D updated with security rationale. NUB-IDENTITY spec: napplet/nubs#12. 6 phases shipped 2026-04-09. See [archive](milestones/v0.24.0-ROADMAP.md).

## Shipped: v0.23.0 Notify NUB

NUB-NOTIFY spec (napplet/nubs#11) for shell-rendered notifications. `@napplet/nub-notify` (8th NUB, 12th package) with 11 message types covering send/dismiss, permissions, actions, channels, badges, priority levels, and shell capability detection. Types + shim + SDK per modular pattern. Core/shim/SDK integrated. All docs updated. 4 phases shipped 2026-04-09. See [archive](milestones/v0.23.0-ROADMAP.md).

## Shipped: v0.22.0 Media NUB + Kill Services

Killed the `svc:` capability namespace — everything is a NUB. Dropped 4 deferred AUDIO_* TOPICS. Drafted NUB-MEDIA spec (napplet/nubs#10) for media session delegation: explicit sessions, multiple per napplet, dynamic capabilities, dual volume, shell control list, full metadata with blossom hash artwork. Created `@napplet/nub-media` (7th NUB, 11th package) with types + shim + SDK per modular pattern. Core/shim/SDK integrated. All docs updated. 5 phases shipped 2026-04-09. See [archive](milestones/v0.22.0-ROADMAP.md).

## Shipped: v0.21.0 NUB Modularization

Moved ALL domain-specific logic from `@napplet/shim` and `@napplet/sdk` into the 5 NUB packages. Each NUB now exports `shim.ts` (installer + message handlers) and `sdk.ts` (convenience wrappers) alongside its type definitions. Shim went from 19KB to 5.75KB — now a thin host that imports NUB installers. Old domain files (`relay-shim.ts`, `state-shim.ts`, `keys-shim.ts`) deleted. DX unchanged: `import '@napplet/shim'` installs all NUBs; named exports allow cherry-picking. 3 phases shipped 2026-04-09. See [archive](milestones/v0.21.0-ROADMAP.md).

## Shipped: v0.20.0 Keys NUB

New `@napplet/nub-keys` package (6th NUB, 10th package) implementing the NUB-KEYS spec (napplet/nubs#9). Bidirectional keyboard protocol: napplet registers named actions, shell binds keys and pushes binding updates, shim suppresses bound keys locally and triggers actions with zero latency. Replaced one-way `keyboard-shim.ts` with full `keys-shim.ts` smart forwarding. SDK convenience wrappers. All READMEs and NIP-5D updated. 5 phases, 2 plans shipped 2026-04-09. See [archive](milestones/v0.20.0-ROADMAP.md).

## Shipped: v0.19.0 Spec Gap Drops

Executed all 7 "drop" verdicts from the v0.18.0 spec conformance audit. Deleted `Capability` type, `ALL_CAPABILITIES`, 13 TOPICS entries (superseded/config/relay), `SHELL_BRIDGE_URI`, `REPLAY_WINDOW_SECONDS`, `PROTOCOL_VERSION`, and `constants.ts` entirely. `@napplet/core` now exports only spec-backed artifacts. 1 phase, 1 plan shipped 2026-04-09. See [archive](milestones/v0.19.0-ROADMAP.md).

## Shipped: v0.18.0 Spec Conformance Audit

Audited entire codebase against NIP-5D and NUB specs. Removed dead code (handshake types, unused functions, dead re-exports). Created exhaustive spec gap inventory (SPEC-GAPS.md) documenting every unspecced artifact. Fixed stale documentation across 5 files. Captured drop/defer/amend decisions for all gaps: 7 items to drop in v0.19.0, 5 deferred, 1 for spec amendment (keyboard forwarding). Corrected inventory: IFC channels and nostrdb are spec-backed via draft NUB PRs. 4 phases, 4 plans shipped 2026-04-09. See [archive](milestones/v0.18.0-ROADMAP.md).

## Shipped: v0.17.0 Capability Cleanup

Namespaced `shell.supports()` with `nub:`/`perm:`/`svc:` prefixes replacing flat `NubDomain | string`. Deleted `legacy.ts`, `discovery-shim.ts`, `ServiceDescriptor`/`ServiceInfo` types, `window.napplet.services` API, and `napplet-napp-type` backward compat. All READMEs updated. 3 phases, 3 plans shipped 2026-04-08. See [archive](milestones/v0.17.0-ROADMAP.md).

## Shipped: v0.16.0 Wire Format & NUB Architecture

Replaced NIP-01 array wire format with generic JSON envelope `{ type: "domain.action", ...payload }`. NIP-5D v4 is now transport+identity+manifest+NUB-negotiation only — zero protocol messages. 4 NUB packages (@napplet/nub-relay, nub-signer, nub-storage, nub-ifc) with 52 typed message definitions. Core dispatch infrastructure with registerNub/dispatch. Shim fully migrated to JSON envelope. SDK re-exports 62 NUB types. Protocol version 4.0.0. 6 phases, 10 plans shipped 2026-04-07. See [archive](milestones/v0.16.0-ROADMAP.md).

## Shipped: v0.15.0 Protocol Simplification

Removed cryptographic identity from the napplet wire protocol. Napplets now send plain unsigned NIP-01 messages; shell identifies senders via unforgeable MessageEvent.source at iframe creation. AUTH handshake (REGISTER/IDENTITY/AUTH) eliminated. @napplet/shim dropped nostr-tools dependency. Protocol version bumped to 3.0.0. NIP-5D and all READMEs updated. 4 phases, 4 plans shipped 2026-04-07. See [archive](milestones/v0.15.0-ROADMAP.md).

## Shipped: v0.14.0 Repo Cleanup & Audit

Dead code, stale docs, and leftover artifacts from v0.13.0 extraction cleaned up. 2 phases, 3 plans shipped 2026-04-06. See [archive](milestones/v0.14.0-ROADMAP.md).

## Shipped: v0.13.0 Runtime Decoupling & Publish

Runtime, shell, ACL, services, and demo extracted to a separate repo. @napplet slimmed to 4-package SDK (core, shim, sdk, vite-plugin). GitHub Actions CI/CD with changesets. 6 phases, 11 plans shipped 2026-04-06. See [archive](milestones/v0.13.0-ROADMAP.md).

## Shipped: v0.12.0 Spec Packaging

SPEC.md renamed to RUNTIME-SPEC.md as internal reference with header linking to NIP-5D. NIP-5D v2 finalized at 199 lines with References section (5 cited NIPs) and Implementations section. 8 package READMEs and 4 source files updated to reference RUNTIME-SPEC.md. 1 phase, 1 plan shipped 2026-04-06. See [archive](milestones/v0.12.0-ROADMAP.md).

## Shipped: v0.11.0 Clean up Side Panel

Inspector side panel reorganized into 3 tabs (Node/Constants/Kinds) with contextual filtering. Data layer extended with role annotations and query methods. Constants tab shows only editable values filtered by selected topology node. Kinds tab shows read-only protocol references. Tab persistence across node selection. Show-all toggle escape hatch. 3 phases, 4 plans shipped 2026-04-05. See [archive](milestones/v0.11.0-ROADMAP.md).

## Shipped: v0.10.0 Demo Consistency and Usability Pass

Constants panel exposing all 23 protocol magic numbers with live editing. ACL detail panel with per-napplet capability status, rejection history, and full-screen policy matrix. Directional edge/node coloring with 5 persistence modes (flash, rolling, decay, last-message, trace). Service enable/disable toggles and individual capability toggles with cross-view sync. Hop-by-hop trace animation mode. 5 phases, 20 plans shipped 2026-04-04. See [archive](milestones/v0.10.0-ROADMAP.md).

## Shipped: v0.9.0 Identity & Trust

Shell-delegated keypair handshake (REGISTER → IDENTITY → AUTH) with deterministic key derivation via HMAC-SHA256. Storage rekeyed to `dTag:aggregateHash` (pubkey removed) — persists across reloads. Shell-side aggregate hash verification with caching. Per-iframe persistent GUID. Delegated keys confined to protocol auth only. RuntimeHooks/ShellHooks deprecated aliases removed. SPEC.md §2, §5, §14 updated. 3 phases, 7 plans shipped 2026-04-02. See [archive](milestones/v0.9.0-ROADMAP.md).

## Shipped: v0.8.0 Shim/SDK Split

`@napplet/shim` is now a pure side-effect window installer (zero named exports). `window.napplet` is fully namespaced (`relay`, `ipc`, `services`, `storage`). New `@napplet/sdk` package provides typed named exports for bundler consumers. All deprecated v0.7.0 symbols removed. 4 phases, 10 plans shipped 2026-04-02. See [archive](milestones/v0.8.0-ROADMAP.md).

## Shipped: v0.6.0 Demo Upgrade

The demo is now an architecture-accurate teaching and testing surface. 7 phases, 28 plans shipped 2026-04-01. See [archive](milestones/v0.6.0-ROADMAP.md).

## Requirements

### Validated

- ✓ Pseudo-relay message router (NIP-01 REQ/EVENT/CLOSE/COUNT dispatch) — existing
- ✓ NIP-42 AUTH handshake with ephemeral session keypairs — existing
- ✓ ACL capability system (relay:read, relay:write, sign:*, storage:*) — existing
- ✓ NIP-07/NIP-44 signer proxy (napplet requests signatures from shell) — existing
- ✓ Storage proxy with scoped keys (pubkey:dTag:aggregateHash isolation) — existing
- ✓ Inter-pane pubsub via kind 29003 topic events — existing
- ✓ Napplet-side SDK (subscribe, publish, query, emit, on, nappStorage) — existing
- ✓ Shell-side runtime (createShellBridge factory, ShellHooks DI) — existing
- ✓ Vite plugin for NIP-5A dev-mode manifest injection — existing
- ✓ Replay attack detection on incoming events — existing
- ✓ ConsentRequest flow for destructive signing kinds — existing
- ✓ Decoupled packages working end-to-end with wiring fixes — v0.1.0
- ✓ 66 behavioral tests covering full protocol surface (AUTH, routing, replay, lifecycle, ACL, storage, signer, IPC) — v0.1.0
- ✓ Interactive Chat + Bot demo with visual protocol debugger — v0.1.0
- ✓ Refined NIP-5A specification with implementation learnings — v0.1.0
- ✓ Packages validated (publint + arethetypeswrong) at v0.1.0-alpha.1 — v0.1.0
- ✓ ShellBridge rename (pseudo-relay → ShellBridge), storage → state rename — v0.2.0
- ✓ @napplet/acl pure module — bitfield caps, immutable state, zero deps, WASM-ready — v0.2.0
- ✓ Single enforce() gate in ShellBridge — all messages through one ACL checkpoint — v0.2.0
- ✓ 56 ACL behavioral tests (122 total) — full capability × action matrix — v0.2.0
- ✓ Shell code cleanup — verb-noun naming, JSDoc, clean internals — v0.2.0
- ✓ @napplet/core — zero-dep shared protocol types, constants, topics — v0.3.0
- ✓ @napplet/runtime — browser-agnostic protocol engine with RuntimeHooks — v0.3.0
- ✓ Shell slimmed to thin browser adapter (746→180 lines), shim rewired to core — v0.3.0
- ✓ Service extension design — ServiceRegistry types, kind 29010, SPEC.md Section 11 — v0.3.0
- ✓ 180 tests green across four-package structure (core, runtime, integration, e2e) — v0.3.0
- ✓ Shell export cleanup — dead code removed, enforce deduplicated, singletons cleaned — v0.3.0
- ✓ ServiceDescriptor in @napplet/core, ServiceHandler/ServiceRegistry in @napplet/runtime, topic-prefix dispatch — v0.4.0 Phase 18
- ✓ Service discovery protocol — kind 29010 REQ/EVENT/EOSE flow, synthetic events from registry, live subscriptions — v0.4.0 Phase 19
- ✓ Shim-side discovery API — window.napplet global with discoverServices/hasService/hasServiceVersion, session cache, ServiceInfo type — v0.4.0 Phase 21
- ✓ @napplet/services package — createAudioService and createNotificationService as ServiceHandlers, audio:* prefix only, browser-agnostic — v0.4.0 Phase 20
- ✓ Manifest requires tags — vite plugin injects ["requires","service-name"] into NIP-5A manifest, <meta napplet-requires> into index.html — v0.4.0 Phase 22 (COMPAT-01)
- ✓ Compatibility check at AUTH — runtime reads manifest requires, checks ServiceRegistry, builds CompatibilityReport, fires onCompatibilityIssue; strict mode blocks load — v0.4.0 Phase 22 (NEG-01..04, COMPAT-02, COMPAT-03)
- ✓ Undeclared service consent — checkUndeclaredService fires at INTER_PANE dispatch time; ConsentRequest type discriminator 'undeclared-service'; per-session consent cache — v0.4.0 Phase 22 (NEG-05)
- ✓ strictMode configurable via RuntimeHooks — permissive default, strict blocks napplet loading on missing services — v0.4.0 Phase 22 (NEG-06)
- ✓ Core infra as registered services — signer, relay pool, cache extractable as ServiceHandlers; RuntimeHooks.relayPool/.cache now optional; dual-path dispatch with hook fallback — v0.4.0 Phase 22.1 (SVC-04)
- ✓ Package READMEs for all 7 packages — shim, shell, vite-plugin, core, runtime, acl, services — v0.5.0 Phases 23-24
- ✓ SPEC.md updated for v0.4.0 — Section 11 service discovery, ShellBridge rename, requires/compat protocol — v0.5.0 Phase 25
- ✓ Skills directory — 3 agentskills.io-format skill files: build-napplet, integrate-shell, add-service — v0.5.0 Phase 26 (SKILL-01, SKILL-02, SKILL-03)
- ✓ Demo audit and correctness pass — host path inventory, signer service wiring, path-aware debugger labels, and regression coverage for relay/state/signer denials — v0.6.0 Phase 27 (DEMO-01, DEMO-02, DEMO-03)
- ✓ Demo flow view separates napplets, shell, ACL, runtime, and service nodes in distinct topology nodes with hierarchy edges and animation — v0.6.0 Phase 28 (ARCH-01, ARCH-02)
- ✓ Node detail adapter and compact summary surfaces — role-specific summaryFields on every topology node, live from host/runtime state — v0.6.0 Phase 29 (NODE-01)
- ✓ Right-side inspector pane with selected-node state, recent-activity projection, and debugger coexistence — v0.6.0 Phase 29 (NODE-02)
- ✓ Notification service as first-class topology node with toast UX, protocol activity visibility, and service state panel — v0.6.0 Phase 30 (NOTF-01, NOTF-02, NOTF-03)
- ✓ Signer connection UX with NIP-07/NIP-46 flows, QR code, configurable relay, and signer topology node — v0.6.0 Phase 31 (SIGN-01..05)
- ✓ Demo UI/UX bug fixes — amber state, Leader Line SVG edges, ACL isAmber logic, signer error detection — v0.6.0 Phase 32
- ✓ Polish pass — iframe fill, perpendicular topology edges, separated in/out ports, orphan edge removal, button isolation — v0.6.0 Phase 33
- ✓ BusKind.INTER_PANE renamed to BusKind.IPC_PEER across all 7 packages and SPEC.md — v0.7.0 Phase 35 (WIRE-01)
- ✓ ConsentRequest consolidated to @napplet/runtime canonical (type? + serviceName? fields); shell/types.ts stale copy removed; shell re-exports from runtime — v0.7.0 Phase 36 (TYPE-01)
- ✓ shell/state-proxy.ts dead code deleted (superseded by runtime/state-handler.ts in Phase 13) — v0.7.0 Phase 36 (TYPE-02)
- ✓ RuntimeAdapter/ShellAdapter canonical; RuntimeHooks/ShellHooks @deprecated aliases for one release cycle — v0.7.0 Phase 37 (API-01, API-02)
- ✓ SessionEntry/SessionRegistry replace NappKeyEntry/NappKeyRegistry — v0.7.0 Phase 38 (SESS-01, SESS-02)
- ✓ napplet: topic prefix direction semantics documented; nappStorage @deprecated — v0.7.0 Phase 39 (DOC-01)
- ✓ createEphemeralKeypair() (no params) replaces loadOrCreateKeypair(_nappType) in @napplet/shim — v0.7.0 Phase 40 (SESS-03)
- ✓ Nip5aManifestOptions.nappletType replaces nappType as public API field in @napplet/vite-plugin — v0.7.0 Phase 40 (TERM-01)
- ✓ SPEC.md stale napp: topic strings replaced with napplet: (state-response, audio-muted, napplet-state:) — v0.7.0 Phase 40 (TERM-04, WIRE-02)
- ✓ `@napplet/shim` is a pure window installer with zero named exports — v0.8.0 Phase 41 (PKG-01, DEP-01, DEP-02)
- ✓ `window.napplet` is fully namespaced (`relay`, `ipc`, `services`, `storage`) — v0.8.0 Phase 41 (WIN-01, WIN-02, WIN-03, WIN-04)

- ✓ `@napplet/sdk` exists as a standalone bundler-friendly package (thin wrappers + helpers) — v0.8.0 Phase 42 (PKG-02, PKG-03, SDK-01, SDK-02, SDK-03)
- ✓ Demo napplets and test fixtures migrated to window.napplet namespaced API — v0.8.0 Phase 43 (ECO-01, ECO-02)
- ✓ SPEC.md, shim README, and SDK README updated for shim/SDK split — v0.8.0 Phase 44 (ECO-03, ECO-04, ECO-05)
- ✓ Shell-delegated keypair handshake (REGISTER/IDENTITY/AUTH) with deterministic key derivation — v0.9.0 Phase 46 (AUTH-01..04)
- ✓ Shell-side aggregate hash verification with caching — v0.9.0 Phase 46 (VERIFY-01..03)
- ✓ Storage rekeyed to `dTag:aggregateHash` (pubkey removed), persists across reloads — v0.9.0 Phase 46 (STORE-01..03)
- ✓ Per-iframe persistent GUID for instance identity — v0.9.0 Phase 46 (INST-01)
- ✓ Delegated keys confined to protocol auth, blocked from relay publishing — v0.9.0 Phase 46 (SEC-01, SEC-02)
- ✓ RuntimeHooks/ShellHooks deprecated aliases removed — v0.9.0 Phase 47 (DEP-03, DEP-04)
- ✓ SPEC.md Sections 2, 5, 14 updated for v0.9.0 handshake, storage, and security models — v0.9.0 Phase 48 (DOC-01..03)
- ✓ Protocol magic numbers exposed in constants panel with live editing — v0.10.0 Phase 49 (TRANS-01, TRANS-02)
- ✓ ACL detail panel with per-napplet capabilities, rejection history, and full-screen policy matrix — v0.10.0 Phase 50 (TRANS-03, TRANS-04)
- ✓ Directional edge/node coloring with 5 persistence modes (flash, rolling, decay, last, trace) — v0.10.0 Phase 51 (COLOR-01, COLOR-02)
- ✓ Per-message hop-by-hop trace animation mode — v0.10.0 Phase 53 (COLOR-03)
- ✓ Service enable/disable toggles with cross-view sync (topology, modal, inline panel) — v0.10.0 Phase 52 (TOGL-01, TOGL-03)
- ✓ Individual ACL capability toggles per napplet with live-reload — v0.10.0 Phase 52 (TOGL-02)
- ✓ ConstantDef extended with relevantRoles topology annotations and query methods — v0.11.0 Phase 54 (DATA-01, DATA-02)
- ✓ Kinds tab with read-only protocol kind reference cards — v0.11.0 Phase 55 (TAB-01)
- ✓ Constants tab constrained to editable-only values — v0.11.0 Phase 55 (TAB-02)
- ✓ Tab persistence across node selection — v0.11.0 Phase 55 (TAB-03)
- ✓ Contextual filtering by selected node role with show-all fallback — v0.11.0 Phase 56 (FILT-01, FILT-02)
- ✓ Show-all toggle to bypass contextual filtering — v0.11.0 Phase 56 (FILT-03)
- ✓ SPEC.md renamed to RUNTIME-SPEC.md as internal reference — v0.12.0 Phase 61 (PKG-01)
- ✓ NIP-5D v2 in nostr-protocol/nips markdown format (<200 lines, setext headings) — v0.12.0 Phase 61 (PKG-02)
- ✓ NIP-5D lists @napplet/shim as reference implementation — v0.12.0 Phase 61 (PKG-03)

- ✓ Shell runtime packages extracted to separate repo — v0.13.0 Phases 62-64
- ✓ @napplet slimmed to 4 packages, build clean — v0.13.0 Phase 65 (CLEAN-01..04)
- ✓ GitHub Actions CI/CD workflows for @napplet — v0.13.0 Phase 66 (PUB-01..03)
- ✓ READMEs updated for 4-package SDK — v0.13.0 Phase 67 (DOC-01, DOC-02)

- ✓ Handshake types (RegisterPayload, IdentityPayload, AUTH_KIND, VERB_REGISTER, VERB_IDENTITY) removed from @napplet/core — v0.15.0 Phase 70 (WIRE-01..04, RT-01..04)
- ✓ @napplet/shim stripped of all signing, keypair, AUTH code; nostr-tools dependency dropped — v0.15.0 Phase 71 (SHIM-01..04)
- ✓ NIP-5D v3 rewritten for simplified wire protocol (no AUTH, shell-assigned identity via MessageEvent.source) — v0.15.0 Phase 72 (DOC-02)
- ✓ All package READMEs updated for no-crypto API surface — v0.15.0 Phase 73 (DOC-03)

- ✓ NIP-5D v4: JSON envelope `{ type, ...payload }`, transport+identity+manifest+NUB-negotiation only — v0.16.0 Phase 74 (SPEC-01..04)
- ✓ Core envelope types (NappletMessage, NubDomain, ShellSupports) + NUB dispatch infrastructure — v0.16.0 Phases 75-76 (CORE-01, CORE-02)
- ✓ 4 NUB packages with 52 typed message definitions (relay 13, signer 14, storage 10, ifc 15) — v0.16.0 Phase 77 (NUB-01..04)
- ✓ Shim fully migrated to JSON envelope wire format, window.napplet API unchanged — v0.16.0 Phase 78 (SHIM-01..03)
- ✓ SDK re-exports 62 NUB types + domain constants; all READMEs updated — v0.16.0 Phases 78-79 (DOC-01)

- ✓ Namespaced `shell.supports()` with `nub:`/`perm:`/`svc:` prefixes — v0.17.0 Phase 80 (CAP-01..03)
- ✓ Dead service discovery code removed (discovery-shim, ServiceDescriptor, legacy.ts, services API) — v0.17.0 Phase 81 (DEAD-01..07, COMPAT-01..02)
- ✓ READMEs updated for cleaned-up API surface — v0.17.0 Phase 82 (DOC-01..04)

- ✓ Dead code removed (RegisterPayload, IdentityPayload, getNappletType, shim/types.ts, leaked exports) — v0.18.0 Phase 83 (DEAD-01..05)
- ✓ Spec gap inventory created (SPEC-GAPS.md) with 10 entries across 8 GAP IDs — v0.18.0 Phase 84 (GAP-01..09)
- ✓ Stale documentation fixed (services.has→shell.supports, theme NUB in tables, D-02/D-03 removed) — v0.18.0 Phase 85 (DOC-01..05)
- ✓ Drop/defer/amend decisions captured for all spec gaps — v0.18.0 Phase 86 (DECIDE-01)

- ✓ All 7 drop-verdict artifacts deleted from @napplet/core — v0.19.0 Phase 87 (DROP-01..09)

- ✓ @napplet/nub-keys package with 6 typed message definitions — v0.20.0 Phase 88 (NUB-01, NUB-02)
- ✓ 'keys' in NubDomain + NappletGlobal.keys namespace — v0.20.0 Phase 89 (CORE-01, CORE-02)
- ✓ Smart forwarding shim with suppress list, safety guards, action registration — v0.20.0 Phase 90 (SHIM-01..04)
- ✓ SDK keys namespace + convenience registerAction() + type re-exports — v0.20.0 Phase 91 (SDK-01..03)
- ✓ nub-keys README, NIP-5D keys row, core/shim/SDK README updates — v0.20.0 Phase 92 (DOC-01..03)

- ✓ All 5 NUB packages export shim installers + SDK helpers — v0.21.0 Phase 93 (NUB-01..07)
- ✓ Shim/SDK refactored to thin hosts importing from NUB packages — v0.21.0 Phase 94 (SHIM-01..04, SDK-01..03)
- ✓ Build clean, API surface identical — v0.21.0 Phase 95 (VER-01..02)

- ✓ svc: namespace removed from NamespacedCapability + all docs — v0.22.0 Phase 96 (SVC-01..03)
- ✓ NUB-MEDIA spec drafted → napplet/nubs#10 — v0.22.0 Phase 97 (SPEC-01)
- ✓ @napplet/nub-media package (types + shim + SDK) — v0.22.0 Phase 98 (NUB-01..02)
- ✓ 'media' in NubDomain + NappletGlobal + shim integration — v0.22.0 Phase 99 (CORE-01..02, SHIM-01)
- ✓ All docs updated for media NUB and svc: removal — v0.22.0 Phase 100 (DOC-01..03)

- ✓ NUB-NOTIFY spec drafted → napplet/nubs#11 — v0.23.0 Phase 101 (SPEC-01)
- ✓ @napplet/nub-notify package (types + shim + SDK, 11 message types) — v0.23.0 Phase 102 (NUB-01..02)
- ✓ 'notify' in NubDomain + NappletGlobal + shim/SDK integration — v0.23.0 Phase 103 (CORE-01..02, SHIM-01)
- ✓ All docs updated for notify NUB — v0.23.0 Phase 104 (DOC-01..03)

- ✓ window.nostr removed, nub-signer deleted — v0.24.0 Phase 105 (KILL-01..04)
- ✓ NUB-IDENTITY spec → napplet/nubs#12 — v0.24.0 Phase 106 (SPEC-01)
- ✓ @napplet/nub-identity package (9 query types + shim + SDK) — v0.24.0 Phase 107 (NUB-01..02)
- ✓ relay.publishEncrypted added, NUB-RELAY updated — v0.24.0 Phase 108 (RELAY-01..03)
- ✓ 'identity' in NubDomain + core/shim/SDK integration — v0.24.0 Phase 109 (CORE-01..02, SHIM-01)
- ✓ NIP-5D updated (no NIP-07, security rationale), all READMEs — v0.24.0 Phase 110 (DOC-01..03)

- ✓ NUB-CONFIG spec drafted and published as napplet/nubs#13 — v0.25.0 Phase 111 (SPEC-01..08)
- ✓ @napplet/nub-config package scaffolded (types + barrel, JSON Schema dep edges) — v0.25.0 Phase 112 (NUB-01, NUB-02, NUB-05, NUB-06)
- ✓ @napplet/nub-config shim + SDK (installConfigShim, ref-counted subscribers, 5 SDK wrappers, meta-tag schema read) — v0.25.0 Phase 113 (NUB-03, NUB-04)
- ✓ @napplet/vite-plugin configSchema option with 3-path discovery, manifest tag, aggregateHash participation, meta injection, build-time structural guards — v0.25.0 Phase 114 (VITE-01..07)
- ✓ 'config' in NubDomain + NappletGlobal.config + shim mount/routing + SDK re-exports + shell.supports('config') — v0.25.0 Phase 115 (WIRE-01..06, CORE-01..02, SHIM-01, SDK-01, CAP-01)
- ✓ @napplet/nub-config README + NIP-5D Known NUBs row + 4 package READMEs (core/shim/sdk/vite-plugin) — v0.25.0 Phase 116 (DOC-01..06)

- ✓ New `@napplet/nub` package with 34 subpath entry points (9 barrel + 9 types + 8 shim + 8 sdk), zero-dep (core-only), `sideEffects: false`, no root `.` export — v0.26.0 Phase 117 (PKG-01..03, EXP-01..04, BUILD-01..02)
- ✓ 9 deprecated `@napplet/nub-<domain>` packages converted to 1-line re-export shims with `[DEPRECATED]` description + README banners + 0.3.0 changeset — v0.26.0 Phase 118 (MIG-01..03)
- ✓ `@napplet/shim` + `@napplet/sdk` migrated off deprecated package names: shim uses `/shim` granular subpaths, sdk uses `/<domain>` barrels — v0.26.0 Phase 119 (CONS-01..03)
- ✓ New `@napplet/nub` README + root + core + shim + sdk READMEs updated; defunct `@napplet/nub-signer` references purged; spec/skills sweep clean — v0.26.0 Phase 120 (DOC-01..04)
- ✓ Monorepo build + type-check green across 14 packages; tree-shaking bundle = 39 bytes with 0 cross-domain leakage; 9 pinned-consumer type-check smokes green — v0.26.0 Phase 121 (VER-01..03)

- ✓ `window.napplet.ipc` renamed to `window.napplet.ifc` across `@napplet/core` types + `@napplet/shim` installer, no backward-compat alias — v0.27.0 Phase 122 (API-01)
- ✓ `@napplet/sdk` named export renamed `ipc` → `ifc` with JSDoc + section header updates — v0.27.0 Phase 122 (API-02)
- ✓ `@napplet/core` JSDoc + `packages/nub/src/ifc/sdk.ts` identifiers and JSDoc aligned to IFC-PEER / "inter-frame"; `requireIpc` → `requireIfc` — v0.27.0 Phase 122 (SRC-01)
- ✓ Root README + `@napplet/{core,shim,sdk}` READMEs swept to IFC terminology in current-API sections with historical changelog bullets preserved — v0.27.0 Phase 123 (DOC-01)
- ✓ `skills/build-napplet/SKILL.md` frontmatter, body prose, and code samples aligned with IFC / "inter-frame" terminology — v0.27.0 Phase 123 (DOC-02)
- ✓ Active `.planning/codebase/*.md` + research docs swept to IFC / accurate transport terminology; `TESTING.md` lines 83/152 rewritten to `postMessage`; 7 dated files preserved byte-identical — v0.27.0 Phase 123 (PLAN-01)
- ✓ `pnpm -r build` + `pnpm -r type-check` exit 0 across all 14 workspace packages with renamed API surface — v0.27.0 Phase 124 (VER-01)
- ✓ Repo-wide first-party-surface zero-grep clean (`packages/`, `specs/`, `skills/`, root README, `.planning/codebase/`) with `INTEGRATIONS.md:168` historical-constant exception and Option (a) path-exclusion for self-describing planning docs — v0.27.0 Phase 124 (VER-02)

- ✓ `NubDomain` union extended with `'resource'` (10th domain) + `NappletGlobal.resource` slot with `bytes(url, opts?)` and `bytesAsObjectURL(url, opts?)` types; `@napplet/core` `tsconfig.json` adds `DOM`/`DOM.Iterable` lib so `Blob` global is in scope — v0.28.0 Phase 125 (CORE-01..03)
- ✓ `@napplet/nub/resource` subpath shipped — single-flight `bytes(url)` with inline `data:` decoder (zero postMessage), AbortSignal cancellation with `resource.cancel` envelope, synchronous `bytesAsObjectURL()` with non-enumerable `ready` Promise extension — v0.28.0 Phase 126 (RES-01..07, SCH-01)
- ✓ NUB-RELAY optional `resources?: ResourceSidecarEntry[]` sidecar field on `RelayEventMessage`; relay shim invokes `hydrateResourceCache()` BEFORE `onEvent()` so synchronous `bytes(sidecarUrl)` inside napplet's `onEvent` resolves from single-flight cache with zero round-trips — v0.28.0 Phase 127 (SIDE-01..04)
- ✓ `window.napplet.resource` mounted via central `@napplet/shim`; `shell.supports('nub:resource')` + `shell.supports('resource:scheme:*')` pass-through wiring; DEF-125-01 closed (workspace-wide type-check green across 14 packages) — v0.28.0 Phase 128 (CAP-01..02, SHIM-01..03)
- ✓ `@napplet/sdk` re-exports resource namespace + `RESOURCE_DOMAIN` constant + 11 type re-exports + `installResourceShim` + SDK helpers — all sourced from `@napplet/nub/resource` barrel with no subpath reaching — v0.28.0 Phase 129 (SDK-01..03)
- ✓ `@napplet/vite-plugin` `strictCsp?: boolean \| StrictCspOptions` option shipping opt-in 10-directive CSP baseline, HMR-relaxed dev `connect-src` vs prod `'none'`, meta-first-head-child assertion, header-only directive rejection, `'unsafe-inline'`/`'unsafe-eval'` refusal, nonce-based script-src, 4 project-killer pitfall hard-failures at build time — v0.28.0 Phase 130 (CSP-01..07, CAP-03)
- ✓ `specs/NIP-5D.md` Security Considerations gained "Browser-Enforced Resource Isolation" subsection naming `perm:strict-csp` capability, NUB-RESOURCE cross-reference, and `sandbox="allow-scripts"` (no `allow-same-origin`) reaffirmation — v0.28.0 Phase 131 (SPEC-01)
- ✓ Four draft PRs authored at `.planning/phases/132-cross-repo-nubs-prs/drafts/` for `napplet/nubs`: NUB-RESOURCE (new spec, 300 lines with 4 schemes, 8-code error vocabulary, SSRF-at-DNS-resolution-time MUSTs, SVG sandboxed-Worker-no-network rasterization MUST) + NUB-RELAY amendment (default-OFF sidecar with privacy rationale + per-event-kind allowlist) + NUB-IDENTITY clarification (picture/banner URLs flow through `resource.bytes()`) + NUB-MEDIA clarification (artwork URL flows through `resource.bytes()`). All 4 drafts `@napplet/*`-clean — v0.28.0 Phase 132 (SCH-02..04, POL-01..06, SVG-01..03, SPEC-02..06, SIDE-05)
- ✓ 5 package READMEs (core, shim, sdk, nub, vite-plugin) + `skills/build-napplet/SKILL.md` + root README + new `specs/SHELL-RESOURCE-POLICY.md` (195 lines shell-deployer checklist) updated for v0.28.0 surface; v0.28.0 demo napplets explicitly delegated to downstream shell repo via coordination note — v0.28.0 Phase 133 (DOC-01..07, DEMO-01)
- ✓ All 7 VER gates PASS: workspace `pnpm -r build` + `pnpm -r type-check` exit 0 across 14 packages (VER-01), Playwright positive-CSP-block simulation `{cspViolation:true, requestFailedForBlocked:true}` (VER-02), SVG rejection spec conformance (3 MUSTs + 3 SHOULD caps + 3 attack vectors named) (VER-03), single-flight cache stampede N=10 → envelopeCount=1 all-same-Blob (VER-04), sidecar default-OFF + privacy rationale + per-event-kind allowlist (VER-05), cross-repo zero-grep 0/0/0/0 across 4 drafts (VER-06), tree-shake relay-types-only bundle 74 bytes with 0 resource-shim symbols (VER-07) — v0.28.0 Phase 134 (VER-01..07)

- ✓ Shell-enforced NIP-07 injection detection mechanism: CSP `report-to` directive + violation-correlation via `(dTag, aggregateHash)`; shell policy latitude (MAY refuse-to-serve / reject envelopes / surface to user) — v0.29.0 Phases 136+137 (DETECT-02..04, CLASS1-01..03)

- ✓ NUB-CONNECT + NUB-CLASS drafted in napplet/nubs (4 specs: NUB-CONNECT + NUB-CLASS + NUB-CLASS-1 + NUB-CLASS-2), canonical `connect:origins` fold byte-locked to fixture `cc7c1b19…1aa742` — v0.29.0 Phase 135
- ✓ NIP-5D amended to NUB-neutral transport-only (Browser-Enforced Resource Isolation subsection generalized, `perm:strict-csp` example removed) — v0.29.0 Phase 135
- ✓ `'connect'` + `'class'` added to `NubDomain`/`NUB_DOMAINS` (12 entries); `NappletGlobal` gains `connect: NappletConnect` + optional `class?: number`; `perm:strict-csp` `@deprecated` — v0.29.0 Phase 136
- ✓ `@napplet/nub/connect` + `@napplet/nub/class` subpath scaffolds (8 new entry points) with shared `normalizeConnectOrigin()` + `ClassAssignedMessage` wire type + tree-shake contract — v0.29.0 Phase 137
- ✓ `@napplet/vite-plugin` strictCsp production path removed (accept-but-warn shim for one release); `connect?: string[]` option with aggregateHash fold + fail-loud inline-script diagnostic + module-load conformance self-check — v0.29.0 Phase 138
- ✓ Central shim + SDK integration: `window.napplet.connect` (default `{granted: false, origins: []}`) + `window.napplet.class` (default `undefined`); `class.assigned` dispatcher routing — v0.29.0 Phase 139
- ✓ `specs/SHELL-CONNECT-POLICY.md` + `specs/SHELL-CLASS-POLICY.md` — shell-deployer checklists with class-determination authority, wire timing, cross-NUB invariants, revocation UX — v0.29.0 Phase 140
- ✓ Documentation sweep: root README + 4 package READMEs + SKILL.md updated for two-class posture + NUB-RESOURCE-first guidance — v0.29.0 Phase 141
- ✓ 13 VER gates green: `pnpm -r build` + `type-check` across 14 packages; 54 new vitest tests; 3 documented Playwright fixtures; cross-repo zero-grep clean; v0.29.0 changeset authored — v0.29.0 Phase 142

- ✓ `identity.decrypt(event) → Promise<{ rumor, sender }>` on NUB-IDENTITY — shell-mediated NIP-04 / direct NIP-44 / NIP-17 gift-wrap auto-detect decrypt; gated shell-side to napplets assigned `class: 1` per NUB-CLASS-1 — v0.30.0 Phase 137 (DEC-01..08, GATE-01..04)
- ✓ `IdentityDecryptErrorCode` 8-code vocabulary (class-forbidden, signer-denied, signer-unavailable, decrypt-failed, malformed-wrap, impersonation, unsupported-encryption, policy-denied) — v0.30.0 Phase 137 (DEC-04)
- ✓ 4 shell MUSTs in NUB-IDENTITY amendment: class-gating, outer-sig-verify, impersonation-check (seal.pubkey === rumor.pubkey), outer-`created_at` hiding — v0.30.0 Phase 137 (DEC-06..08, GATE-01)
- ✓ `Rumor = UnsignedEvent & { id: string }` (nostr-tools canonical) + `UnsignedEvent` added to `@napplet/core`; `NappletGlobal.identity.decrypt` method type — v0.30.0 Phase 135 (TYPES-01..04)
- ✓ Discriminated-union exhaustiveness via `assertNever` in `handleIdentityMessage`; new `identity.decrypt.result` + `.error` branches — v0.30.0 Phase 135 (TYPES-05, SHIM-01..03)
- ✓ `@napplet/sdk` 4-surgical-edit pattern: `identity.decrypt(event)` method, bare-name `identityDecrypt` helper, type re-exports — v0.30.0 Phase 135 (SDK-01..02)
- ✓ Empirical Chromium 144+ CSP injection-block: legacy `<script>`-tag injection blocked, `securitypolicyviolation` fires with `violatedDirective: "script-src-elem"`, 4-field report shape captured — v0.30.0 Phase 136 (DETECT-01, VER-04)
- ✓ NUB-IDENTITY + NUB-CLASS-1 cross-repo amendment authored on napplet/nubs branch `nub-identity-decrypt` with hygiene-clean diff (0/0/0 for `@napplet/*`/`kehto`/`hyprgate`); filename citation discipline (`NUB-CLASS-1.md` 7×; zero "Class 1" primary references); human opens PR — v0.30.0 Phase 137 (NUB-IDENTITY-01..07, VER-02, VER-03)
- ✓ In-repo `specs/NIP-5D.md` `### NIP-07 Extension Injection Residual` subsection documenting `all_frames: true` vector + nonce-based `script-src` mitigation + `world: 'MAIN'` honest residual + `connect-src 'none'` structural mitigation; cites `NUB-IDENTITY.md` + `NUB-CLASS-1.md` by filename — v0.30.0 Phase 138 (NIP5D-01..04, VER-06)
- ✓ 4 docs surfaces updated: `packages/nub/README.md` (Identity NUB v0.29.0 section + 8-code error table), `packages/sdk/README.md` (identity namespace + identityDecrypt helper), root `README.md` (first Changelog section), `skills/build-napplet/SKILL.md` (Step 11 NIP-17 decrypt guidance) — v0.30.0 Phase 138 (DOC-01..04)

### Active

- [ ] v0.31.0 Cleanup Quality Gate: vulnerable dev-tool dependencies are upgraded to patched versions and the lockfile proves `vite >=6.4.2`, `postcss >=8.5.10`, and `turbo >=2.9.14`.
- [ ] v0.31.0 Cleanup Quality Gate: fixable scanner warnings are removed without broad rewrites or new dependencies.
- [ ] v0.31.0 Cleanup Quality Gate: unsafe casts and complexity hotspots are reduced behind regression coverage, with any intentionally deferred structural work documented.

### Future Requirements (deferred from v0.26.0)

- REMOVE-01: Delete the 9 deprecated `@napplet/nub-<domain>` packages from the repo
- REMOVE-02: Remove the deprecated packages from the publish workflow and pnpm-workspace.yaml
- REMOVE-03: Remove deprecation banners / `@deprecated` metadata references

### Out of Scope

- Mobile native wrapper — web-first protocol, native later
- Framework-specific bindings (Svelte/React components) — SDK is framework-agnostic by design
- Multi-shell federation — single shell per page for v1
- IndexedDB storage backend — localStorage sufficient for v1
- Key rotation for delegated keypairs — complexity not justified yet
- Rate limiting on signer requests — document expected behavior, don't enforce yet
- Restrictive ACL default mode — permissive default for developer adoption (v0.2.0 adds proper enforcement, restrictive mode later)
- Manifest signature verification in shell — deferred to post-v1 security hardening
- Arbitrary custom napplet loading in the demo shell — defer until the built-in demo is architecture-accurate and trustworthy again
- DAW implementation or audio-specific protocols — NIP-5C only designs the channel primitive that could support it

## Context

- **Current state**: v0.29.0 Class-Gated Decrypt Surface shipped 2026-04-23. 14 packages: 4 core SDK (core, shim, sdk, vite-plugin) + consolidated `@napplet/nub` with 38 subpath entry points + 9 deprecated `@napplet/nub-<domain>` re-export shims. Runtime API adds `window.napplet.identity.decrypt(event): Promise<{ rumor, sender }>` — shell-mediated NIP-04 / NIP-44 / NIP-17 auto-detect decrypt gated to napplets assigned `class: 1` per NUB-CLASS-1. Resource NUB (v0.28.0) remains canonical byte primitive. Local `specs/NIP-5D.md` carries both v0.28.0 Browser-Enforced Resource Isolation and v0.29.0 NIP-07 Extension Injection Residual Security Considerations subsections. 29 milestones shipped.
- **Current state**: v0.29.0 shipped (NUB-CONNECT + Shell as CSP Authority). 14 packages: 4 core SDK (core, shim, sdk, vite-plugin) + consolidated `@napplet/nub` with 46 subpath entry points (adds `/connect/{index,types,shim,sdk}` + `/class/{index,types,shim,sdk}`) + 9 deprecated `@napplet/nub-<domain>` re-export shims (slated for removal in a future milestone). Runtime API surface adds `window.napplet.connect` (`{granted, origins}`) + `window.napplet.class` (`number | undefined`); `nub:connect`/`nub:class` + `connect:scheme:<http|ws>` capability identifiers; `perm:strict-csp` `@deprecated`; `strictCsp` vite-plugin option accept-but-warn for one release cycle (hard-removal tracked as REMOVE-STRICTCSP for a future milestone (originally scheduled v0.30.0, but v0.30.0 shipped Class-Gated Decrypt instead — see milestones/v0.30.0-ROADMAP.md)). Canonical `connect:origins` aggregateHash fold byte-locked to fixture `cc7c1b1903fb23ecb909d2427e1dccd7d398a5c63dd65160edb0bb8b231aa742`. 29 milestones shipped.
- **Current quality gate**: The v0.31.0 cleanup milestone starts from the 2026-05-24 `aislop 0.9.3` report: 1 high security error (`vite`), 2 moderate dependency warnings (`postcss`, `turbo`), 14 lint warnings, 9 code-quality warnings, and 301 AI-slop warnings. The work is behavior-preserving cleanup, not a protocol expansion.
- **Package architecture**: @napplet: core(0 deps) | nub(core) | shim(core+nub) | sdk(core+nub) | vite-plugin. Deprecated `@napplet/nub-<domain>` (×9) re-export `@napplet/nub/<domain>` and are kept for one release cycle. Shell runtime packages in a separate repo.
- **Spec status**: NIP-5D v2 at 199 lines covers AUTH handshake, relay proxy, capability discovery, and NUB extension reference. Ready for PR submission to nostr-protocol/nips.
- **NUB specs**: 6 interface specs drafted in `specs/nubs/` (RELAY, STORAGE, SIGNER, NOSTRDB, IPC, PIPES). Governance framework defined but not formalized (NUB-01/02/03 deferred).
- **Demo architecture**: Full topology view with distinct shell, ACL, runtime, and service nodes. Inspector has 3 tabs (Node, Constants, Kinds) with contextual filtering.
- **Tech stack**: TypeScript 5.9, Vite 6.3, tsup 8.5, turborepo 2.5, pnpm 10.8, Vitest 4 + Playwright for testing, UnoCSS for demo styling.
- **Test coverage**: 122 Playwright e2e tests + 71 vitest unit/integration tests (~193 total). Coverage spans AUTH, routing, replay, lifecycle, ACL enforcement, storage, signer, inter-pane, core imports, runtime dispatch, service dispatch, service discovery, and compatibility.
- **Documentation**: All 8 packages have README.md. RUNTIME-SPEC.md (41KB+) covers full protocol. NIP-5D.md is the terse external spec. 3 portable skill files in skills/ directory.
- **Known remaining issues**: Permissive ACL default. postMessage origin '*' trust boundary. Fake event IDs on shell-injected events. npm publish blocked on human auth. NIP number conflict with Scrolls PR#2281 (RES-01). No automated e2e tests for REGISTER/IDENTITY step (covered by UAT only).

## Constraints

- **ESM-only**: No CJS output — all packages are ESM
- **Zero framework deps**: No Svelte, React, Vue — framework-agnostic SDK
- **nostr-tools peer dep**: shim and shell depend on nostr-tools >=2.23.3 <3.0.0
- **iframe sandbox**: No allow-same-origin — everything proxied via postMessage
- **Monorepo tooling**: pnpm workspaces + turborepo + tsup + changesets

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Extract from reference implementation rather than rewrite | Proven protocol implementation, minimize risk | ✓ Good — packages working with targeted fixes |
| Behavioral tests over unit tests first | Visually confirm protocol works end-to-end before testing internals | ✓ Good — 66 Playwright tests prove the protocol |
| Refine existing NIP-5A spec, not write new | Spec already captures protocol; implementation surfaced 11 needed changes | ✓ Good — SPEC.md refined with all implementation learnings |
| Permissive ACL default kept for v0.1 | Ease of development; document risk, add restrictive mode later | ✓ Good — tests verify permissive behavior, restrictive mode deferred |
| Relay URI `shell://` | Clear direction signal (napplet → shell) | ✓ Good |
| Storage keys() uses repeated NIP tags | Follows Nostr convention, eliminates comma-join delimiter bug | ✓ Good |
| Missing AUTH tags fail (strict) | Napplets must build correctly; prevents misconfigured apps | ✓ Good — AUTH-08/09 tests verify |
| Pre-AUTH queue capped at 50 | Prevents memory abuse, configurable globally and per-napp | ✓ Good |
| Vite plugin is dev-only | Community deploy tools handle production manifests | ✓ Good — clear separation of concerns |
| Chat + Bot demo napplets | Interactive, demonstrates all capabilities, teachable bot | ✓ Good |
| UnoCSS for demo styling | Tailwind-compatible, Vite ecosystem, easy to modify | ✓ Good |
| UTF-8 byte count for storage quota | Consistent cross-platform, replaces inconsistent Blob approach | ✓ Good |
| @napplet/acl as separate package | Package boundary enforces zero deps, WASM-ready | ✓ Good — Phase 8 delivered zero-dep pure module |
| Target architecture: acl → core → runtime → shell | Multi-shell support. Third-party shells depend on @napplet/runtime, not @napplet/shell. Runtime extraction when second shell exists. | ✓ Good — Phase 13 delivered browser-agnostic runtime with RuntimeHooks interface |
| ServiceDescriptor in @napplet/core, ServiceHandler/Registry in @napplet/runtime | Shared types need no dependency on runtime; handler interface lives where it's consumed | ✓ Good — clean layering across all 7 packages |
| handleMessage(windowId, message, send) interface for ServiceHandler | Services receive raw NIP-01 arrays + send callback; decoupled from runtime internals | ✓ Good — consistent across all concrete services |
| Dual-path dispatch for core infra (service → hook fallback) | Backwards-compatible migration; shell hosts using RuntimeHooks directly still work | ✓ Good — zero breaking changes, SVC-04 satisfied |
| audio:* topic prefix only (shell:audio-* dropped) | Alpha — no external consumers; clean break prevents legacy accumulation | ✓ Good — no compatibility burden |
| Undeclared service consent reuses ConsentRequest pattern | Same hook, same UX flow as destructive signing kinds — shell hosts get one integration point | ✓ Good — minimal API surface growth |
| Demo must mirror actual runtime architecture | The demo is now a teaching tool and debugger; flattening shell/ACL/runtime hides the protocol model and misleads users | Phase 27 established the audited host/debugger truth; Phase 28 will finish the topology UI |
| Custom napplet loading deferred until after demo refresh | First make the built-in demo accurate and debuggable before opening a generic test harness | Pending post-v0.6.0 review |
| HMAC-SHA256(shellSecret, dTag+aggregateHash) for key derivation | Deterministic, standard primitive, shell secret never exposed to napplet | ✓ Good — same napplet always gets same keypair |
| Hash mismatch warns but doesn't block registration | Adoption-friendly — developers aren't locked out during development | ✓ Good — onHashMismatch callback gives host apps flexibility |
| Triple-read storage migration across 3 historical formats | Zero data loss on upgrade — reads new format, then legacy with pubkey, then old napp-state: prefix | ✓ Good — backward compat with no user action |
| SEC-01 explicit BusKind allowlist (not 29000-29999 range) | Principle of least privilege — future bus kinds must opt in | ✓ Good — though SPEC.md says range (known debt) |
| SPEC.md → RUNTIME-SPEC.md with internal-reference header | Distinguishes internal reference from NIP standard; header links to NIP-5D | ✓ Good — no confusion between runtime spec and protocol NIP |
| Historical PROJECT.md SPEC.md references left as-is | These are milestone descriptions, not active cross-references | ✓ Good — avoids rewriting history |
| Remove crypto from napplet wire protocol | message.source is unforgeable; napplet can't hash itself; shell knows identity at iframe creation | ✓ Good — simpler spec, thinner shim, crypto is runtime impl detail |
| Protocol version 2.0.0 → 3.0.0 | Breaking change to handshake; downstream shell must update | ✓ Good — clean break |
| Replace NIP-01 arrays with JSON envelope | NIP-5D should describe transport, not relay semantics; simpler for NIP reviewers and shell implementors | ✓ Good — spec is 120 lines, 5-minute read |
| NUBs own protocol messages, NIP-5D is transport-only | Composable: shells implement only the NUBs they support | ✓ Good — modular spec architecture |
| Sandbox: allow-scripts only | Minimal trust; everything else is shell-granted privilege | ✓ Good — follows principle of least privilege |
| Namespaced shell.supports() with nub:/perm:/svc: prefixes | Flat NubDomain\|string caused collision risk; three namespaces with explicit prefixes; bare NUB shorthand kept for ergonomics | ✓ Good — replaced v0.16.0 flat API |
| NUB-IFC merges IPC + PIPES | dispatch (per-msg ACL) and channel (ACL at open) are modes, not separate specs | ✓ Good — one NUB, two patterns |
| Protocol version 3.0.0 → 4.0.0 | JSON envelope replaces NIP-01 arrays; breaking wire format change | ✓ Good — clean break |
| Shell owns production CSP, not vite-plugin | CSP belongs on the HTTP response serving the napplet, not in build-time meta tags — shell is the only actor with authority over iframe origin and response headers | ✓ Good — v0.29.0 inverted v0.28.0 strictCsp machinery; strict posture moves from build-declared to shell-enforced |
| NUB-CLASS as an abstract authority NUB with a sub-track (NUB-CLASS-$N) | Class semantics are composable across voluntary NUBs; a single flat "class" enum would collapse NUB independence | ✓ Good — NUB-CLASS-1 (strict) and NUB-CLASS-2 (user-approved connect origins) shipped as independent sub-track documents |
| NUB-CONNECT has no postMessage wire protocol | Grants flow through HTTP response CSP + `<meta name="napplet-connect-granted">` read synchronously at shim install; no envelope needed once the browser is enforcing | ✓ Good — meta-tag-driven shim keeps NUB-CONNECT trivially implementable and removes postMessage round-trip from the hot path |
| `normalizeConnectOrigin()` as shared single-source-of-truth | Build-side validator (vite-plugin) and shell-side validator MUST agree byte-for-byte on origin canonicalization or grants silently invalidate | ✓ Good — exported from `@napplet/nub/connect/types`; vite-plugin imports it directly; 21 rule violations enumerated, 28/28 smoke tests pass |
| Module-load conformance-fixture self-check in vite-plugin | A silent drift between the plugin's `connect:origins` fold and the NUB-CONNECT spec digest would cause every grant to auto-invalidate mysteriously; loud ESM-init throw is preferable to silent shell-side mismatch | ✓ Good — `assertConnectFoldMatchesSpecFixture` perturbation-tested; drifts in join delimiter, sort order, encoding, or hash algorithm throw immediately at import time |
| Fail-loud inline-script diagnostic in closeBundle | Shell serves `script-src 'self'` — an inline `<script>` in dist/index.html would silently fail at runtime with no author feedback; build-time throw surfaces the bug before ship | ✓ Good — closeBundle assertNoInlineScripts throws on any `<script>` without `src` attribute |
| Delegate v0.29.0 demo napplets to downstream shell repo (Option B, carried from v0.28.0) | Demo napplets exercising NUB-CONNECT require a real shell with CSP-response-header authority; the SDK repo is not the right place to run them | ✓ Good — 3 documented Playwright fixtures authored at `packages/nub/src/connect/__fixtures__/` are self-contained for downstream translation |
| Single `resource.bytes(url) → Blob` primitive, scheme-pluggable URL space | One napplet API; shell registers handlers per scheme. Per-scheme APIs would fragment surface and lock napplets to scheme identity | ✓ Good — 4 canonical schemes (`data:`/`https:`/`blossom:`/`nostr:`) at spec; napplet sees one function |
| `data:` scheme decoded inline in shim, zero postMessage | Avoids round-trip latency for trivially-derivable bytes; precedent for scheme decoders | ✓ Good — establishes in-shim decoder pattern for future schemes (blob:, etc.) |
| Single-flight cache keyed on raw URL string | N concurrent same-URL calls share 1 fetch; canonicalization deferred to NUB-RESOURCE spec | ✓ Good — N=10 stampede proven, 1 envelope per unique URL |
| Sidecar opt-in default-OFF on NUB-RELAY | Privacy — shells that pre-resolve blindly reveal the user's IP for every URL in every event; explicit opt-in + per-event-kind allowlist required | ✓ Good — privacy-preserving default matches NIP-5D isolation intent |
| Hashes stay shell-internal; napplets address by URL only | Scheme identity hidden behind one primitive; napplet can't discriminate on hash | ✓ Good — napplet author writes `bytes(url)` with zero hash knowledge |
| Shell-side SVG rasterization (sandboxed Worker, no network) | SVG is scriptable XML; delivering raw SVG defeats iframe isolation (foreignObject, billion-laughs, recursive refs, external entity refs) | ✓ Good — NUB-RESOURCE locks raster delivery; napplets never receive `image/svg+xml` |
| Strict CSP normative level in NIP-5D: **SHOULD** | Required for isolation posture but waivable by permissive dev shells; ergonomic gradient for adoption | ✓ Good — Phase 131 amendment locks it |
| CSP capability split: `nub:resource` (API) orthogonal to `perm:strict-csp` (posture) | Two independent decisions: "do I support the API" vs "am I running under the strict posture". Collapsing them forces shells to ship both or neither | ✓ Good — consumers negotiate API and posture independently |
| Vite dev CSP relaxation for HMR, build enforces `connect-src 'none'` | Dev experience requires ws/wss to `localhost`; prod must block everything; build-time assertion prevents leakage | ✓ Good — VER-02 Playwright confirms browser-layer enforcement |
| Demo napplets delegated to downstream shell repo (Option B) | Demos require complete shell including resource handler, policy enforcement, SVG rasterizer — all shell-side concerns living outside this monorepo since v0.13.0 extraction | ✓ Good — this monorepo ships wire+SDK only; demos live where the shell lives |
| Borrow-don't-own: relay NUB type-only imports `ResourceSidecarEntry` | Cross-NUB wire-shape sharing without runtime cross-domain dep; ownership stays with defining NUB | ✓ Good — establishes cross-NUB type-borrow pattern for future sidecar-style composition |
| SEED-002 direction pivot: Option A (`relay.subscribeEncrypted`) → Option 2 (`identity.decrypt`) | Subscription-variant wire surface cannot cleanly express per-class gating on an ambient per-event delivery; per-call `identity.decrypt` naturally gates shell-side and mirrors `relay.publishEncrypted` send-side symmetry | ✓ Good — cleaner surface, one-shot request/result, class-gating enforceable at message-handling time |
| `identity.decrypt` gated to NUB-CLASS-1 only | NUB-CLASS-1 ships `connect-src 'none'` → plaintext trapped inside the frame; NUB-CLASS-2 ships `connect-src <granted>` → approved origins receive plaintext with zero shell visibility (unmitigated DM exfil risk) | ✓ Good — invariant ties plaintext-exposure to zero-egress posture |
| Shell-enforced class gating, not shim-enforced | Napplets are untrusted; any policy the shim alone enforces is bypassable. Shell enforcement is load-bearing; shim is defense-in-depth only | ✓ Good — trust boundary correctly placed |
| Shell-enforced NIP-07 injection detection via CSP `report-to` | Shell authors the CSP; adding `report-to` gives both blocking AND observability from one mechanism; violation-correlation via `(dTag, aggregateHash)` lets shell correlate to napplet identity | ✓ Good — Chromium 144+ empirical proof locks the mechanism |
| `world: 'MAIN'` extension-API residual acknowledged, not pretended fixed | Extensions using `chrome.scripting.executeScript({world:'MAIN'})` bypass page CSP per WebExtension spec; no page-side mechanism can block; structural mitigation (NUB-CLASS-1 `connect-src 'none'`) traps plaintext regardless | ✓ Good — honest residual documentation in NIP-5D + NUB-IDENTITY |
| Filename citation discipline (NUB-CLASS §Citation) | NUB-CLASS document renames / retirements would break "Class 1" phrase references; filename citations are stable | ✓ Good — `NUB-CLASS-1.md` cited 7× in NUB-IDENTITY amendment; zero "Class 1" primary references |
| `Rumor = UnsignedEvent & { id: string }` (no `sig` field) | nostr-tools canonical shape; forbidding `sig` at type level prevents accidental signed-event handling; `sender` field shell-authenticated separately | ✓ Good — type-level guard against attacker-controlled `rumor.pubkey` confusion |
| GATE-04 shim-side short-circuit deferred | `NappletGlobal.class` slot does not exist yet (NUB-CLASS is PR #16 on napplet/nubs, draft); "MAY short-circuit when window.napplet.class !== 1" is forward-looking spec prose | ✓ Good — shell enforcement authoritative; shim adds observability when `.class` slot lands |
| v0.31.0 cleanup is behavior-preserving | Scanner remediation should improve security and maintainability without changing the NUB protocol or shell trust boundary | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check -- still the right priority?
3. Audit Out of Scope -- reasons still valid?
4. Update Context with current state

## Future Milestone Candidates

Likely next candidates (ordered by current signal strength):
- Submit NIP-5D PR to nostr-protocol/nips
- Formalize NUB governance (NUB-01/02/03) and create napplets org/repo
- Publish all @napplet/* packages to npm (blocked on human npm auth)
- Package alignment with NIP-5D (remove signer proxy kinds 29001/29002, rename internal interfaces)
- Load custom napplets into the demo shell for ad-hoc shell/ACL/runtime testing
- `@napplet/create` CLI / starter template
- Deploy demo as a production nsite
- Channel/pipe protocol implementation in packages (NUB-PIPES)
- Automated e2e tests for REGISTER/IDENTITY handshake step

---
*Last updated: 2026-05-24 — started v0.31.0 Cleanup Quality Gate from current `aislop` security and quality findings.*
