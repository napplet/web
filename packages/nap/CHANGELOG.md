# @napplet/nap

## 0.23.0

### Minor Changes

- 688fb59: Align first-party packages with current NIP-5D runtime injection.

  Runtimes now expose available NAPs by injecting `window.napplet.<domain>`
  properties before napplet code runs. The retired generic shell capability
  surface is removed from active package APIs: no `window.napplet.shell`, no
  `shell.ready` / `shell.init` handshake, and no `@napplet/nap/shell` subpath.

  Conformance now injects the runtime namespace before fixture code and validates
  only NAP domain envelopes. Skills and package guidance now teach domain-property
  presence instead of the retired shell supports API.

### Patch Changes

- Updated dependencies [688fb59]
  - @napplet/core@0.23.0

## 0.22.1

### Patch Changes

- 0c45563: Guard relay query results so malformed host responses without an `events` array
  resolve to `[]` instead of leaking `undefined` through the typed query contract.

## 0.22.0

### Minor Changes

- 7e0c5bc: Add NAP-DM as a runtime-mediated direct-message capability with typed payloads,
  `@napplet/nap/dm` subpath exports, `window.napplet.dm`, SDK wrappers, and
  conformance validator coverage.

### Patch Changes

- Updated dependencies [7e0c5bc]
  - @napplet/core@0.22.0

## 0.21.0

### Minor Changes

- b0e0c76: Add the NAP-RESOURCE `resource.bytesMany` bulk byte-fetch surface, including
  wire types, shim and SDK helpers, core global types, and conformance coverage.

### Patch Changes

- Updated dependencies [b0e0c76]
  - @napplet/core@0.21.0

## 0.20.0

### Minor Changes

- c6f8645: Add NAP-BLE package support with core types, `@napplet/nap/ble` subpaths, `window.napplet.ble`, SDK helpers, conformance validators, and reference-shell responses.

### Patch Changes

- Updated dependencies [c6f8645]
  - @napplet/core@0.20.0

## 0.19.0

### Minor Changes

- 61431b7: Add NAP-COMMON common social actions.

  The new `common` domain exposes shell-mediated public NIP-19 encode/decode,
  profile lookup, follows, follow/unfollow, reactions, and reports. The shell owns
  identity, consent, event construction, signing, publishing, relay access, and
  NIP-19 handling.

- 086f36e: Implement the draft NAP-LISTS surface from napplet/naps#68.

  Adds the `lists` domain to `NapDomain`/`NAP_DOMAINS`, exposes
  `window.napplet.lists.supported/add/remove`, publishes the
  `@napplet/nap/lists` subpaths, re-exports SDK helpers and types, and teaches
  the conformance envelope validator/reference shell about the `lists.*` wire
  messages.

### Patch Changes

- Updated dependencies [61431b7]
- Updated dependencies [086f36e]
  - @napplet/core@0.19.0

## 0.18.0

### Minor Changes

- 5cb3187: Add NAP-WEBRTC package support with core types, `@napplet/nap/webrtc` subpaths, `window.napplet.webrtc`, SDK helpers, conformance validators, and reference-shell responses.

### Patch Changes

- Updated dependencies [5cb3187]
  - @napplet/core@0.18.0

## 0.17.0

### Minor Changes

- 51b2ff1: Align NAP-INTENT availability with manifest-derived contracts from
  `napplet/naps` PR #55. Intent candidates now expose required `contracts`
  records, and the Vite plugin emits one archetype manifest tag per protocol with
  optional per-protocol `kind:<number>` constraints.

### Patch Changes

- ef8ad6b: Add the NAP-LINK shell-mediated link opening surface, including core types,
  `@napplet/nap/link` subpaths, `window.napplet.link`, SDK helpers, and
  conformance/reference-shell support.
- Updated dependencies [51b2ff1]
- Updated dependencies [ef8ad6b]
  - @napplet/core@0.17.0

## 0.16.0

### Minor Changes

- 488ca0a: Add the NAP-SERIAL package surface.

  This adds the `serial` NAP domain to core capability typing, exposes
  `@napplet/nap/serial` types/shim/sdk/barrel subpaths, installs
  `window.napplet.serial` through `@napplet/shim`, re-exports serial helpers from
  `@napplet/sdk`, and teaches conformance validation/reference-shell handling
  about `serial.open`, `serial.write`, `serial.close`, and `serial.event`.

### Patch Changes

- Updated dependencies [488ca0a]
  - @napplet/core@0.16.0

## 0.15.0

### Minor Changes

- 49b4660: Make the iframe boundary clone-safe so framework reactive values no longer fail silently.

  Every NAP shim crosses the napplet ⇄ shell boundary by structured-cloning a JSON
  envelope through `postMessage`. Framework reactive values — Svelte 5 `$state`, Vue
  `reactive`, Solid stores — are `Proxy` objects that aren't structured-cloneable, so
  `postMessage` threw a `DataCloneError` that got silently swallowed in async paths;
  the envelope simply never crossed (napplet/web#67).

  - **`@napplet/core`** adds `sendEnvelope`, `toCloneableSnapshot`, `setCloneMode`,
    `getCloneMode`, `clearCloneWarnings`, and the `CloneMode` / `PostMessageTarget`
    types. The default `'auto'` mode posts as-is and, only on a `DataCloneError`,
    snapshots the envelope (stripping reactive proxies while preserving binary,
    `Date`, `Map`, `Set`, and cycles) and retries — warning once. `'strict'` throws a
    loud, actionable, synchronous error instead; `'snapshot'` normalizes eagerly.
  - **`@napplet/nap`** and **`@napplet/shim`** now post every envelope through this
    boundary instead of calling `window.parent.postMessage(msg, '*')` directly.

  These are SDK plumbing only — the bytes placed on the wire are identical plain
  envelopes, so no NAP/protocol surface changes.

### Patch Changes

- Updated dependencies [49b4660]
  - @napplet/core@0.15.0

## 0.14.0

### Minor Changes

- 6dcb2ac: Retire the residual NAP-CLASS `class` field from NAP-SHELL (AGENTS.md rule 8: a
  deferred NAP's surface must not outlive the NAP). The opaque `class` integer was
  re-homed into NAP-SHELL's `shell.init` environment during the NAP-CLASS defer,
  but canonical NAP-SHELL carries no class field. The `shell.init` wire shape is
  now `{ capabilities, services }`.

  **BREAKING CHANGE:**

  - `shell.init` no longer carries `class`.
  - `ShellEnvironment`, `ShellInitMessage`, and `NappletShell` no longer have a
    `class` field (`@napplet/core`).
  - `window.napplet.shell.class` is removed (`@napplet/shim`).
  - `@napplet/nap/shell` no longer exports `shellClass()`.
  - The conformance reference shell emits a class-free `shell.init` and its
    `createReferenceShell` no longer accepts a `class` option (`@napplet/conformance`).

### Patch Changes

- Updated dependencies [6dcb2ac]
  - @napplet/core@0.14.0

## 0.13.0

### Minor Changes

- 6c99508: Add per-instance storage scope (NAP-STORAGE, [github.com/napplet/naps](https://github.com/napplet/naps)). Resolves #57.

  - Storage request messages (`storage.get`/`set`/`remove`/`keys`) gain an optional `scope?: 'shared' | 'instance'` field; `"shared"` is the default. Result messages are unchanged (no `scope`).
  - New `window.napplet.storage.instance.*` surface (`getItem`/`setItem`/`removeItem`/`keys`) — sugar that sets `scope: "instance"` on the wire. Mirrored on `@napplet/sdk`'s `storage.instance.*` and as `storageInstance*` helpers in `@napplet/nap/storage` / `@napplet/sdk`. New `NappletInstanceStorage` type and `StorageScope` type exported.
  - Fully backward compatible: top-level (shared) storage calls emit **no** `scope` field, so they remain byte-identical on the wire to prior versions.

### Patch Changes

- Updated dependencies [6c99508]
  - @napplet/core@0.13.0

## 0.12.0

### Minor Changes

- b75880f: Align the SDK to the updated NAPs track ([github.com/napplet/naps](https://github.com/napplet/naps)).

  - **Defer NAP-CLASS and NAP-CONNECT.** Both are now inactive on the track, so the `class` and `connect` domains are removed from the active surface: `NAP_DOMAINS`/`NapDomain`, `window.napplet.class` / `window.napplet.connect`, the `@napplet/nap/class` + `@napplet/nap/connect` subpaths, the shim installers + sdk re-exports, the conformance validators/checks (incl. `manifest/connect-origins`), and the `@napplet/vite-plugin` `connect` option, manifest `connect` tags, and `napplet-connect-requires` meta. `NAP_DOMAINS` now has 14 entries.
  - **Implement NAP-SHELL** (mandatory, foundational). The `shell.ready` → `shell.init` bootstrap handshake is now a published NAP. `shell.init` carries `{ capabilities: { domains, protocols }, services, class }`. `window.napplet.shell` gains `services`, `class` (opaque integer), `ready(): Promise<ShellEnvironment>`, and `onReady(handler)` alongside `supports(domain, protocol?)`. A new `@napplet/nap/shell` subpath ships the NAP-SHELL types. The conformance engine recognizes `shell.ready`/`shell.init` as the foundational `shell` domain (dropping the previous special-case) and cites NAP-SHELL in its boot/degradation checks.

  BREAKING CHANGE: removes `window.napplet.class` / `window.napplet.connect`, the `@napplet/nap/class` and `@napplet/nap/connect` subpaths, and the `@napplet/vite-plugin` `connect` option; migrates the `shell.init` capabilities shape from `{ naps, sandbox }` to `{ domains, protocols }`.

### Patch Changes

- Updated dependencies [b75880f]
  - @napplet/core@0.12.0

## 0.11.0

### Minor Changes

- 65b7ef1: Add the NAP-THEME shim and SDK so napplets can actually read the shell theme.

  `theme` previously shipped types only — it defined the `theme.get` /
  `theme.get.result` / `theme.changed` wire protocol but no runtime, so a napplet
  had no way to fetch the theme through `window.napplet`. It now mirrors the
  read-only `identity` NAP:

  - `window.napplet.theme.get()` resolves the current `Theme` (colors, optional
    fonts, background media, and title).
  - `window.napplet.theme.onChanged(handler)` fires on shell-pushed `theme.changed`
    updates.
  - New entry points `@napplet/nap/theme/shim` and `@napplet/nap/theme/sdk`, plus
    `themeGet` / `themeOnChanged` / `installThemeShim` re-exported from
    `@napplet/sdk`, and `theme` added to the `NappletGlobal` type in `@napplet/core`.

### Patch Changes

- Updated dependencies [65b7ef1]
  - @napplet/core@0.11.0

## 0.10.0

### Minor Changes

- 731473e: Add NAP-INTENT, archetype intent dispatch. Napplets can now invoke another
  napplet by its role (archetype) through `window.napplet.intent` (`invoke`,
  `open`, `available`, `handlers`, `onChanged`) without addressing it directly.
  The shell resolves the archetype to an installed napplet (honoring the user's
  default-handler preference), creates or focuses its window, and delivers the
  payload using the named NAP-N protocol. Routing (`archetype`) and payload format
  (`protocol`) are orthogonal; the shell owns resolution, default handling, window
  lifecycle, and the cross-napplet trust boundary.

  - `@napplet/core`: `intent` domain added to `NapDomain`/`NAP_DOMAINS`, `intent`
    surface added to `NappletGlobal`, plus the intent value types.
  - `@napplet/nap`: new `@napplet/nap/intent` domain (types/shim/sdk subpaths) with
    request/response correlation and an availability-change listener.
  - `@napplet/shim`: mounts `window.napplet.intent` and routes `intent.*` envelopes.
  - `@napplet/sdk`: `intent` namespace, `intent*` helpers, and INTENT type re-exports.

### Patch Changes

- Updated dependencies [731473e]
  - @napplet/core@0.10.0

## 0.9.0

### Minor Changes

- 2124d9d: Add NAP-UPLOAD, shell-mediated file/blob upload. Napplets can now upload bytes
  through `window.napplet.upload` (`upload`, `status`, `onStatus`) while the
  runtime selects the storage server, signs the rail authorization (NIP-98 for
  NIP-96, kind 24242 for Blossom), performs the HTTP upload, and returns a stable
  URL plus NIP-94 integrity metadata. Napplets never receive signing keys, server
  credentials, or direct network access.

  - `@napplet/core`: `upload` domain added to `NapDomain`/`NAP_DOMAINS`, `upload`
    surface added to `NappletGlobal`, plus the upload value types.
  - `@napplet/nap`: new `@napplet/nap/upload` domain (types/shim/sdk subpaths) with
    request/response correlation and a status-push listener.
  - `@napplet/shim`: mounts `window.napplet.upload` and routes `upload.*` envelopes.
  - `@napplet/sdk`: `upload` namespace, `upload*` helpers, and UPLOAD type re-exports.

### Patch Changes

- Updated dependencies [2124d9d]
  - @napplet/core@0.9.0

## 0.8.1

### Patch Changes

- 44c92ca: Fix JSR publishing: `@napplet/nap`'s `jsr.json` exports map was missing the
  `cvm` and `outbox` subpaths (it had drifted from `package.json`), so JSR
  consumers and dependent packages could not resolve `@napplet/nap/cvm` or
  `@napplet/nap/outbox`. The version-sync tooling now regenerates the `jsr.json`
  exports from `package.json` on every release so the two can no longer drift.

## 0.8.0

### Minor Changes

- 026a8d3: Add NAP-CVM, the native ContextVM bridge. Napplets can now discover ContextVM
  servers and run MCP operations (`tools/list`, `tools/call`, `resources/list`,
  `resources/read`) over Nostr through the shell via `window.napplet.cvm`, while
  the runtime owns all ContextVM transport — relay routing, signing, encryption,
  JSON-RPC correlation, initialization, policy, and optional payment prompts.

  - `@napplet/core`: `cvm` domain added to `NapDomain`/`NAP_DOMAINS`, `cvm`
    surface added to `NappletGlobal`, plus MCP and ContextVM value types.
  - `@napplet/nap`: new `@napplet/nap/cvm` domain (types/shim/sdk subpaths).
  - `@napplet/shim`: mounts `window.napplet.cvm` and routes `cvm.*` envelopes.
  - `@napplet/sdk`: `cvm` namespace, `cvm*` helpers, and CVM type re-exports.

- f371581: Add NAP-OUTBOX, outbox-aware relay routing. Napplets can now query, subscribe,
  publish, and resolve relay plans through `window.napplet.outbox` while the
  runtime owns relay discovery, NIP-65 routing, fallback, deduplication, signature
  validation, and publish fanout.

  - `@napplet/core`: `outbox` domain added to `NapDomain`/`NAP_DOMAINS`, `outbox`
    surface added to `NappletGlobal`, plus the outbox value types.
  - `@napplet/nap`: new `@napplet/nap/outbox` domain (types/shim/sdk subpaths) with
    request/response correlation and an event-emitter subscription handle.
  - `@napplet/shim`: mounts `window.napplet.outbox` and routes `outbox.*` envelopes.
  - `@napplet/sdk`: `outbox` namespace, `outbox*` helpers, and OUTBOX type re-exports.

### Patch Changes

- Updated dependencies [026a8d3]
- Updated dependencies [f371581]
  - @napplet/core@0.8.0

## 0.7.0

### Minor Changes

- Rename the inter-napplet communication surface from NAP-IFC to NAP-INC.

  The canonical domain, capability, runtime namespace, wire messages, and TypeScript names are now `inc`, `nap:inc`, `window.napplet.inc`, `inc.*`, and `Inc*`. `@napplet/nap` keeps deprecated `ifc` subpaths as thin wrappers over the INC implementation, and `@napplet/sdk` keeps deprecated `ifc` aliases for downstream migration.

### Patch Changes

- Updated dependencies
  - @napplet/core@0.7.0

## 0.6.0

### Minor Changes

- Rename the public package and protocol surface to NAP terminology, including `@napplet/nap`, `packages/nap`, `registerNap`, `nap:*`, and `NAP-*` identifiers.

### Patch Changes

- Updated dependencies
  - @napplet/core@0.6.0

## 0.5.0

### Minor Changes

- Align media APIs with ownership-aware NAP-MEDIA sessions.

### Patch Changes

- Updated dependencies
  - @napplet/core@0.5.0

## 0.4.0

### Minor Changes

- Align the package APIs with read-only NAP-IDENTITY: add `identity.changed` / `identity.onChanged`, make `getPublicKey()` represent signed-out state with `""`, remove the old identity decrypt surface and rumor types, and normalize shell support names around canonical `nap:` / `NAP-NN` identifiers.

### Patch Changes

- Updated dependencies
  - @napplet/core@0.4.0

## 0.3.1

### Patch Changes

- Ship the cleanup milestone's scanner, type-boundary, and dependency hygiene changes across the changed runtime packages.
- Updated dependencies
  - @napplet/core@0.3.1

## 0.3.0

### Minor Changes

- 3d22a10: v0.29.0 — NAP-CONNECT + Shell as CSP Authority. Shifts strict CSP emission from the vite-plugin (build time) to the host shell (runtime) for every napplet, and introduces two new NAPs: NAP-CLASS (shell-authoritative abstract security posture via `class.assigned` wire) and NAP-CONNECT (user-gated direct network access declared via `connect` manifest tags).

  **Breaking surface (migration required):**

  - `@napplet/vite-plugin` **strictCsp removed from production path**. The option is retained as an `@deprecated` accept-but-warn shim for one release cycle — the plugin emits one `console.warn` per build per config-resolved if a `strictCsp` value is present, and the option is ignored. Production builds no longer emit `<meta http-equiv="Content-Security-Policy">`. The shell is now the sole authority on runtime CSP for every napplet, per `specs/SHELL-CLASS-POLICY.md`. The option is scheduled for hard-remove in a future milestone (tracked as `REMOVE-STRICTCSP`; originally scheduled for v0.30.0 but deferred when v0.30.0 shipped Class-Gated Decrypt instead).
  - `@napplet/vite-plugin` **inline scripts now break the build.** `closeBundle` scans `dist/index.html` and throws a diagnostic when any `<script>` element lacks a `src` attribute. The shell's baseline CSP is `script-src 'self'`, so inline scripts would be blocked at runtime anyway; failing at build time surfaces the problem before deployment. The allow-list exempts `application/json`, `application/ld+json`, `importmap`, and `speculationrules` blocks.
  - `@napplet/core` **perm:strict-csp is now @deprecated** on `NamespacedCapability`. The template-literal type still accepts it so existing code type-checks; capability advertisement is superseded by `nap:connect` + `nap:class` in v0.29.0. Hard-removal tracked as `REMOVE-STRICTCSP-CAP`.

  **New surface:**

  - `@napplet/vite-plugin` **`connect?: string[]`** option declares required origins. Each origin is validated via the shared `normalizeConnectOrigin()` validator from `@napplet/nap/connect`, emitted as a signed `["connect", "<origin>"]` manifest tag, and folded into `aggregateHash` via a synthetic `connect:origins` entry (lowercase → ASCII-sort → LF-join → UTF-8 → SHA-256 → lowercase hex per NAP-CONNECT §Canonical Fold). Dev-mode-only `<meta name="napplet-connect-requires">` is injected for shell-less `vite serve` previews; the shell-authoritative `napplet-connect-granted` meta is NEVER emitted by the plugin.
  - `@napplet/core` **`NapDomain` union gains `'connect'` and `'class'`** (12 entries in `NAP_DOMAINS`). `NappletGlobal` gains `connect: NappletConnect` (mirrors `resource` block) and `class?: number` (optional — undefined until `class.assigned` wire arrives or when `nap:class` unsupported).
  - `@napplet/nap/connect` **4-file subpath** (`types` / `shim` / `sdk` / `index`). Exports `DOMAIN`, `NappletConnect` interface, pure `normalizeConnectOrigin(origin)` validator (shared source-of-truth for build-side and shell-side — 21 rule violations enumerated, 28/28 smoke tests pass), and `installConnectShim()` which reads `<meta name="napplet-connect-granted">` at install time.
  - `@napplet/nap/class` **4-file subpath** (`types` / `shim` / `sdk` / `index`). Exports `DOMAIN`, `ClassAssignedMessage` wire type (`{ type: 'class.assigned'; id: string; class: number }`), `handleClassMessage` dispatcher handler, and `installClassShim()` which mounts `window.napplet.class` as a readonly getter.
  - `@napplet/shim` bootstraps both installers; **`window.napplet.connect`** defaults to `{granted: false, origins: []}` (never `undefined`); **`window.napplet.class`** defaults to `undefined` (never `0` or `null`). Central dispatcher routes `class.*` envelopes to the class shim's handler.
  - `@napplet/sdk` adds **`CONNECT_DOMAIN`** + **`installConnectShim`** + the `connect` types namespace, and **`CLASS_DOMAIN`** + **`installClassShim`** + the `class` types namespace — parallel to the existing `resource` re-exports.

  **Guidance:**

  - Default to NAP-RESOURCE (`window.napplet.resource.bytes(url)`) for byte fetches — it works in every class posture. Reach for NAP-CONNECT only when the resource NAP cannot express what you need: `POST`/`PUT`/`PATCH` methods, WebSocket, Server-Sent Events, streaming responses, custom request headers, long-lived connections, or third-party libraries that call `fetch`/open sockets directly.
  - Shells implementing BOTH NAPs MUST maintain the cross-NAP invariant: `class === 2` iff `connect.granted === true` at `class.assigned` send time. See `specs/SHELL-CLASS-POLICY.md` § Cross-NAP Invariant for the full scenario table.
  - Demo napplets remain in the downstream shell repo (Option B carried forward from v0.28.0). This SDK ships spec + code only.

  **Migration path from v0.28.0:**

  1. Drop any `strictCsp` option from `vite.config.ts` — the plugin will warn once per build if you leave it. (Required when REMOVE-STRICTCSP lands; optional through v0.30.0.)
  2. Audit `dist/index.html` for inline `<script>` elements without `src`. Move their bodies to external `.js` files imported as modules.
  3. If your napplet needs direct network access, declare origins via the plugin's new `connect: string[]` option. See `specs/SHELL-CONNECT-POLICY.md` for the shell-deployer preconditions your host must satisfy.
  4. Check `shell.supports('nap:class')` and `shell.supports('nap:connect')` before reading `window.napplet.class` / `window.napplet.connect` — both gracefully degrade (`undefined` / `{granted: false, origins: []}` respectively) on non-implementing shells.

- 60c93a0: v0.30.0 — Class-Gated Decrypt Surface. Adds `identity.decrypt(event) → Promise<{ rumor, sender }>` on NAP-IDENTITY — shell-mediated NIP-04 / direct NIP-44 / NIP-17 gift-wrap auto-detect decrypt primitive. Closes the NIP-17 / NIP-59 receive-side gap and gates plaintext access shell-side to napplets assigned `class: 1` per NAP-CLASS-1 (strict baseline posture, `connect-src 'none'`, zero direct network egress).

  This work was originally written and self-labeled as v0.29.0 on the napplet main branch; it has been renumbered to v0.30.0 during a post-merge version split to avoid collision with the v0.29.0 NAP-CONNECT + Shell as CSP Authority milestone (feat/strict-model, shipped 2026-04-21). This changeset describes shipped behavior; the underlying commits already exist in main (Phases 135-138 of the migrated `.planning/milestones/v0.30.0-phases/` archive).

  **New surface:**

  - `@napplet/core` adds `IdentityDecryptMessage`, `IdentityDecryptResultMessage`, `IdentityDecryptErrorMessage` (envelope triad), `IdentityDecryptErrorCode` (8-code union: `class-forbidden`, `signer-denied`, `signer-unavailable`, `decrypt-failed`, `malformed-wrap`, `impersonation`, `unsupported-encryption`, `policy-denied`), `Rumor = UnsignedEvent & { id: string }` (nostr-tools canonical), `UnsignedEvent` interface, and a `NappletGlobal.identity.decrypt(event)` method type. Zero new runtime symbols in the types-only entry point — pure type contract.
  - `@napplet/nap/identity` ships the runtime `decrypt()` binding (request-correlation by id, reusing existing `pendingRequests` infrastructure), the `identity.decrypt.result` / `.error` handler branches (added to `handleIdentityMessage` with discriminated-union exhaustiveness via `assertNever`), and the bare-name `identityDecrypt(event)` helper. Cross-package type-only re-exports of `Rumor` and `UnsignedEvent` so `import { type Rumor } from '@napplet/nap/identity'` resolves.
  - `@napplet/shim` mounts `window.napplet.identity.decrypt` via the central shim — no new install function; the addition is two surgical edits on `packages/shim/src/index.ts` (import block + namespace assembly).
  - `@napplet/sdk` re-exports `identity.decrypt(event)` on the central `identity` namespace, the bare-name `identityDecrypt` helper, and 4 new identity type re-exports plus `Rumor` + `UnsignedEvent` core type re-exports — exactly the v0.28.0 Phase 129 4-surgical-edit pattern.

  **Cross-repo amendments (separate PRs on `napplet/naps`):**

  - `NAP-IDENTITY.md` amended with the `identity.decrypt` envelope triad, full conformance table (4 shell MUSTs: class-gating, outer-sig-verify, impersonation-check on `seal.pubkey === rumor.pubkey` for NIP-17 flows, outer-`created_at` hiding to preserve NIP-59 ±2-day randomization privacy floor), 8-code error vocabulary, and Security Considerations subsection. Authored on branch `nap-identity-decrypt`.
  - `NAP-CLASS-1.md` amended with SHOULD `report-to` row + MUST `(dTag, aggregateHash)` violation-correlation row + Security Considerations subsection distinguishing observability from enforcement. Bundled into the same PR per CLASS1-03 review-convenience clause.
  - `specs/NIP-5D.md` (in-repo) gains a `### NIP-07 Extension Injection Residual` subsection documenting the `all_frames: true` content-script injection vector, nonce-based `script-src` legacy-injection mitigation (Chromium 144+ `script-src-elem` empirical lock), honest `world: 'MAIN'` extension-API residual acknowledgment, and `connect-src 'none'` structural mitigation pointing at `identity.decrypt` as the spec-legal receive-side decrypt path for NAP-CLASS-1 napplets.

  **Acceptance gates:**

  - `pnpm -r build` + `pnpm -r type-check` exit 0 across all 14 packages.
  - Identity-types-only esbuild tree-shake bundle is 129 bytes and contains zero occurrences of the 7 forbidden runtime symbols (decryption gates VER-05).
  - Empirical Chromium 144+ verification: nonce-based `script-src` provably blocks legacy `<script>`-tag content-script injection AND fires `securitypolicyviolation` with `violatedDirective: 'script-src-elem'` and `blockedURI: 'inline'` (4-field report shape captured).
  - `assertNever` exhaustiveness proof captured: deliberate bogus union member triggers TS2345 at the `assertNever` call site in `handleIdentityMessage`.

  **Guidance:**

  - `identity.decrypt` is the only spec-legal receive-side decrypt path. Napplets MUST NOT call `window.nostr.*` for decrypt — even if a NIP-07 browser extension injects `window.nostr` into the iframe via a content script (architecturally unavoidable per WebExtension spec), shells MUST NOT _provide_ `window.nostr` to napplet iframes per NIP-5D §Transport. A shell is free to use its own NIP-07 extension internally to fulfill signing/encryption duties; what is forbidden is exposing `window.nostr` to the napplet.
  - NAP-CLASS-2 napplets (user-approved direct-network posture per NAP-CONNECT) cannot decrypt — they receive `class-forbidden` at the shell boundary because plaintext could exfiltrate to approved origins with zero shell visibility. The class invariant ties plaintext exposure to zero-egress posture.

### Patch Changes

- 066443f: Fix the package publish path so `@napplet/nap` tarballs resolve the internal `@napplet/core` dependency to a semver range instead of leaking the workspace protocol.
- Updated dependencies [3d22a10]
- Updated dependencies [60c93a0]
  - @napplet/core@0.3.0
