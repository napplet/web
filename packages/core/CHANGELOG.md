# @napplet/core

## 0.3.0

### Minor Changes

- 3d22a10: v0.29.0 — NUB-CONNECT + Shell as CSP Authority. Shifts strict CSP emission from the vite-plugin (build time) to the host shell (runtime) for every napplet, and introduces two new NUBs: NUB-CLASS (shell-authoritative abstract security posture via `class.assigned` wire) and NUB-CONNECT (user-gated direct network access declared via `connect` manifest tags).

  **Breaking surface (migration required):**

  - `@napplet/vite-plugin` **strictCsp removed from production path**. The option is retained as an `@deprecated` accept-but-warn shim for one release cycle — the plugin emits one `console.warn` per build per config-resolved if a `strictCsp` value is present, and the option is ignored. Production builds no longer emit `<meta http-equiv="Content-Security-Policy">`. The shell is now the sole authority on runtime CSP for every napplet, per `specs/SHELL-CLASS-POLICY.md`. The option is scheduled for hard-remove in a future milestone (tracked as `REMOVE-STRICTCSP`; originally scheduled for v0.30.0 but deferred when v0.30.0 shipped Class-Gated Decrypt instead).
  - `@napplet/vite-plugin` **inline scripts now break the build.** `closeBundle` scans `dist/index.html` and throws a diagnostic when any `<script>` element lacks a `src` attribute. The shell's baseline CSP is `script-src 'self'`, so inline scripts would be blocked at runtime anyway; failing at build time surfaces the problem before deployment. The allow-list exempts `application/json`, `application/ld+json`, `importmap`, and `speculationrules` blocks.
  - `@napplet/core` **perm:strict-csp is now @deprecated** on `NamespacedCapability`. The template-literal type still accepts it so existing code type-checks; capability advertisement is superseded by `nub:connect` + `nub:class` in v0.29.0. Hard-removal tracked as `REMOVE-STRICTCSP-CAP`.

  **New surface:**

  - `@napplet/vite-plugin` **`connect?: string[]`** option declares required origins. Each origin is validated via the shared `normalizeConnectOrigin()` validator from `@napplet/nub/connect`, emitted as a signed `["connect", "<origin>"]` manifest tag, and folded into `aggregateHash` via a synthetic `connect:origins` entry (lowercase → ASCII-sort → LF-join → UTF-8 → SHA-256 → lowercase hex per NUB-CONNECT §Canonical Fold). Dev-mode-only `<meta name="napplet-connect-requires">` is injected for shell-less `vite serve` previews; the shell-authoritative `napplet-connect-granted` meta is NEVER emitted by the plugin.
  - `@napplet/core` **`NubDomain` union gains `'connect'` and `'class'`** (12 entries in `NUB_DOMAINS`). `NappletGlobal` gains `connect: NappletConnect` (mirrors `resource` block) and `class?: number` (optional — undefined until `class.assigned` wire arrives or when `nub:class` unsupported).
  - `@napplet/nub/connect` **4-file subpath** (`types` / `shim` / `sdk` / `index`). Exports `DOMAIN`, `NappletConnect` interface, pure `normalizeConnectOrigin(origin)` validator (shared source-of-truth for build-side and shell-side — 21 rule violations enumerated, 28/28 smoke tests pass), and `installConnectShim()` which reads `<meta name="napplet-connect-granted">` at install time.
  - `@napplet/nub/class` **4-file subpath** (`types` / `shim` / `sdk` / `index`). Exports `DOMAIN`, `ClassAssignedMessage` wire type (`{ type: 'class.assigned'; id: string; class: number }`), `handleClassMessage` dispatcher handler, and `installClassShim()` which mounts `window.napplet.class` as a readonly getter.
  - `@napplet/shim` bootstraps both installers; **`window.napplet.connect`** defaults to `{granted: false, origins: []}` (never `undefined`); **`window.napplet.class`** defaults to `undefined` (never `0` or `null`). Central dispatcher routes `class.*` envelopes to the class shim's handler.
  - `@napplet/sdk` adds **`CONNECT_DOMAIN`** + **`installConnectShim`** + the `connect` types namespace, and **`CLASS_DOMAIN`** + **`installClassShim`** + the `class` types namespace — parallel to the existing `resource` re-exports.

  **Guidance:**

  - Default to NUB-RESOURCE (`window.napplet.resource.bytes(url)`) for byte fetches — it works in every class posture. Reach for NUB-CONNECT only when the resource NUB cannot express what you need: `POST`/`PUT`/`PATCH` methods, WebSocket, Server-Sent Events, streaming responses, custom request headers, long-lived connections, or third-party libraries that call `fetch`/open sockets directly.
  - Shells implementing BOTH NUBs MUST maintain the cross-NUB invariant: `class === 2` iff `connect.granted === true` at `class.assigned` send time. See `specs/SHELL-CLASS-POLICY.md` § Cross-NUB Invariant for the full scenario table.
  - Demo napplets remain in the downstream shell repo (Option B carried forward from v0.28.0). This SDK ships spec + code only.

  **Migration path from v0.28.0:**

  1. Drop any `strictCsp` option from `vite.config.ts` — the plugin will warn once per build if you leave it. (Required when REMOVE-STRICTCSP lands; optional through v0.30.0.)
  2. Audit `dist/index.html` for inline `<script>` elements without `src`. Move their bodies to external `.js` files imported as modules.
  3. If your napplet needs direct network access, declare origins via the plugin's new `connect: string[]` option. See `specs/SHELL-CONNECT-POLICY.md` for the shell-deployer preconditions your host must satisfy.
  4. Check `shell.supports('nub:class')` and `shell.supports('nub:connect')` before reading `window.napplet.class` / `window.napplet.connect` — both gracefully degrade (`undefined` / `{granted: false, origins: []}` respectively) on non-implementing shells.

- 60c93a0: v0.30.0 — Class-Gated Decrypt Surface. Adds `identity.decrypt(event) → Promise<{ rumor, sender }>` on NUB-IDENTITY — shell-mediated NIP-04 / direct NIP-44 / NIP-17 gift-wrap auto-detect decrypt primitive. Closes the NIP-17 / NIP-59 receive-side gap and gates plaintext access shell-side to napplets assigned `class: 1` per NUB-CLASS-1 (strict baseline posture, `connect-src 'none'`, zero direct network egress).

  This work was originally written and self-labeled as v0.29.0 on the napplet main branch; it has been renumbered to v0.30.0 during a post-merge version split to avoid collision with the v0.29.0 NUB-CONNECT + Shell as CSP Authority milestone (feat/strict-model, shipped 2026-04-21). This changeset describes shipped behavior; the underlying commits already exist in main (Phases 135-138 of the migrated `.planning/milestones/v0.30.0-phases/` archive).

  **New surface:**

  - `@napplet/core` adds `IdentityDecryptMessage`, `IdentityDecryptResultMessage`, `IdentityDecryptErrorMessage` (envelope triad), `IdentityDecryptErrorCode` (8-code union: `class-forbidden`, `signer-denied`, `signer-unavailable`, `decrypt-failed`, `malformed-wrap`, `impersonation`, `unsupported-encryption`, `policy-denied`), `Rumor = UnsignedEvent & { id: string }` (nostr-tools canonical), `UnsignedEvent` interface, and a `NappletGlobal.identity.decrypt(event)` method type. Zero new runtime symbols in the types-only entry point — pure type contract.
  - `@napplet/nub/identity` ships the runtime `decrypt()` binding (request-correlation by id, reusing existing `pendingRequests` infrastructure), the `identity.decrypt.result` / `.error` handler branches (added to `handleIdentityMessage` with discriminated-union exhaustiveness via `assertNever`), and the bare-name `identityDecrypt(event)` helper. Cross-package type-only re-exports of `Rumor` and `UnsignedEvent` so `import { type Rumor } from '@napplet/nub/identity'` resolves.
  - `@napplet/shim` mounts `window.napplet.identity.decrypt` via the central shim — no new install function; the addition is two surgical edits on `packages/shim/src/index.ts` (import block + namespace assembly).
  - `@napplet/sdk` re-exports `identity.decrypt(event)` on the central `identity` namespace, the bare-name `identityDecrypt` helper, and 4 new identity type re-exports plus `Rumor` + `UnsignedEvent` core type re-exports — exactly the v0.28.0 Phase 129 4-surgical-edit pattern.

  **Cross-repo amendments (separate PRs on `napplet/nubs`):**

  - `NUB-IDENTITY.md` amended with the `identity.decrypt` envelope triad, full conformance table (4 shell MUSTs: class-gating, outer-sig-verify, impersonation-check on `seal.pubkey === rumor.pubkey` for NIP-17 flows, outer-`created_at` hiding to preserve NIP-59 ±2-day randomization privacy floor), 8-code error vocabulary, and Security Considerations subsection. Authored on branch `nub-identity-decrypt`.
  - `NUB-CLASS-1.md` amended with SHOULD `report-to` row + MUST `(dTag, aggregateHash)` violation-correlation row + Security Considerations subsection distinguishing observability from enforcement. Bundled into the same PR per CLASS1-03 review-convenience clause.
  - `specs/NIP-5D.md` (in-repo) gains a `### NIP-07 Extension Injection Residual` subsection documenting the `all_frames: true` content-script injection vector, nonce-based `script-src` legacy-injection mitigation (Chromium 144+ `script-src-elem` empirical lock), honest `world: 'MAIN'` extension-API residual acknowledgment, and `connect-src 'none'` structural mitigation pointing at `identity.decrypt` as the spec-legal receive-side decrypt path for NUB-CLASS-1 napplets.

  **Acceptance gates:**

  - `pnpm -r build` + `pnpm -r type-check` exit 0 across all 14 packages.
  - Identity-types-only esbuild tree-shake bundle is 129 bytes and contains zero occurrences of the 7 forbidden runtime symbols (decryption gates VER-05).
  - Empirical Chromium 144+ verification: nonce-based `script-src` provably blocks legacy `<script>`-tag content-script injection AND fires `securitypolicyviolation` with `violatedDirective: 'script-src-elem'` and `blockedURI: 'inline'` (4-field report shape captured).
  - `assertNever` exhaustiveness proof captured: deliberate bogus union member triggers TS2345 at the `assertNever` call site in `handleIdentityMessage`.

  **Guidance:**

  - `identity.decrypt` is the only spec-legal receive-side decrypt path. Napplets MUST NOT call `window.nostr.*` for decrypt — even if a NIP-07 browser extension injects `window.nostr` into the iframe via a content script (architecturally unavoidable per WebExtension spec), shells MUST NOT _provide_ `window.nostr` to napplet iframes per NIP-5D §Transport. A shell is free to use its own NIP-07 extension internally to fulfill signing/encryption duties; what is forbidden is exposing `window.nostr` to the napplet.
  - NUB-CLASS-2 napplets (user-approved direct-network posture per NUB-CONNECT) cannot decrypt — they receive `class-forbidden` at the shell boundary because plaintext could exfiltrate to approved origins with zero shell visibility. The class invariant ties plaintext exposure to zero-egress posture.

## 0.2.1

### Patch Changes

- Republish at 0.2.1 to ship resolved workspace dependency versions. The 0.2.0 tarballs on npm contained unresolved `workspace:*` specs in dependencies, breaking installs. This patch bump exists solely to produce correctly-assembled tarballs via `pnpm publish -r` (which rewrites `workspace:*` → concrete versions at pack time).
