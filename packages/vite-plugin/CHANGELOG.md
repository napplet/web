# @napplet/vite-plugin

## 0.11.1

### Patch Changes

- 954b6bb: Improve JSR score readiness with module docs and explicit public API types.

## 0.11.0

### Minor Changes

- fb434c3: Add `title` and `description` plugin options that inject/override the built HTML `<title>` element and `<meta name="description">` element. Both are plain HTML (not `napplet-*` protocol meta tags): when set they override any existing tag (inserting one after `<head>` if absent) and when omitted the author's HTML is left untouched. Injected values are HTML-escaped for their context. The napplet CLI reads these back out of the built `index.html` to emit the NIP-5A `title` / `description` manifest tags at deploy time.
- fb434c3: Add opt-in NAP requirement inference from static source imports and direct `window.napplet.<domain>` usage.

## 0.10.1

### Patch Changes

- 688fb59: Align first-party packages with current NIP-5D runtime injection.

  Runtimes now expose available NAPs by injecting `window.napplet.<domain>`
  properties before napplet code runs. The retired generic shell capability
  surface is removed from active package APIs: no `window.napplet.shell`, no
  `shell.ready` / `shell.init` handshake, and no `@napplet/nap/shell` subpath.

  Conformance now injects the runtime namespace before fixture code and validates
  only NAP domain envelopes. Skills and package guidance now teach domain-property
  presence instead of the retired shell supports API.

## 0.10.0

### Minor Changes

- 51b2ff1: Align NAP-INTENT availability with manifest-derived contracts from
  `napplet/naps` PR #55. Intent candidates now expose required `contracts`
  records, and the Vite plugin emits one archetype manifest tag per protocol with
  optional per-protocol `kind:<number>` constraints.

## 0.9.0

### Minor Changes

- 6c99508: Emit NAAT archetype manifest tags (napplet/naps `ARCHETYPES.md`). Resolves #58.

  - New optional `archetypes` plugin option: `Array<string | { slug: string; naps?: string[] }>`. Each entry emits one `["archetype", slug, ...naps]` tag on the kind 35129 manifest, where the string shorthand `"feed"` is equivalent to `{ slug: "feed" }`. A napplet may declare several roles; declaring none stays fully valid.
  - Like the `config` tag, archetype tags are excluded from the aggregate `x` hash (NIP-5D §Identity: the aggregate is recomputed from `path` tags alone), so declaring archetypes never changes a napplet's content address.

## 0.8.1

### Patch Changes

- Stop rejecting inline `<script>` — it broke spec-faithful `srcdoc` napplets ([napplet/web#53](https://github.com/napplet/web/issues/53)).

  Per NIP-5D a napplet is a single self-contained `/index.html` loaded via `iframe.srcdoc` with `sandbox="allow-scripts"` and no `allow-same-origin` (an opaque origin). There is no served origin from which to fetch an external `<script src>`, so a napplet's executable JS **must** be inline. The toolchain was enforcing the opposite under an invented "shell-as-CSP-authority / `script-src 'self'`" model that NIP-5D never defines and that was justified by NAP-CONNECT/strict-CSP — since deferred from the NAPs track.

  - **`@napplet/vite-plugin`**: removed `assertNoInlineScripts` and its unconditional `closeBundle` call. The build no longer aborts on inline scripts; `artifactMode: 'single-file'` still folds local script/style assets into `index.html` and now preserves any pre-existing inline scripts verbatim.
  - **`@napplet/conformance`** (and bundled **`@napplet/conformance-cli`**): removed the `manifest/no-inline-scripts` check, the `inline-script` error code, and the `findInlineScripts` export. A conformant napplet that carries inline JS no longer fails conformance.

## 0.8.0

### Minor Changes

- b75880f: Align the SDK to the updated NAPs track ([github.com/napplet/naps](https://github.com/napplet/naps)).

  - **Defer NAP-CLASS and NAP-CONNECT.** Both are now inactive on the track, so the `class` and `connect` domains are removed from the active surface: `NAP_DOMAINS`/`NapDomain`, `window.napplet.class` / `window.napplet.connect`, the `@napplet/nap/class` + `@napplet/nap/connect` subpaths, the shim installers + sdk re-exports, the conformance validators/checks (incl. `manifest/connect-origins`), and the `@napplet/vite-plugin` `connect` option, manifest `connect` tags, and `napplet-connect-requires` meta. `NAP_DOMAINS` now has 14 entries.
  - **Implement NAP-SHELL** (mandatory, foundational). The `shell.ready` → `shell.init` bootstrap handshake is now a published NAP. `shell.init` carries `{ capabilities: { domains, protocols }, services, class }`. `window.napplet.shell` gains `services`, `class` (opaque integer), `ready(): Promise<ShellEnvironment>`, and `onReady(handler)` alongside `supports(domain, protocol?)`. A new `@napplet/nap/shell` subpath ships the NAP-SHELL types. The conformance engine recognizes `shell.ready`/`shell.init` as the foundational `shell` domain (dropping the previous special-case) and cites NAP-SHELL in its boot/degradation checks.

  BREAKING CHANGE: removes `window.napplet.class` / `window.napplet.connect`, the `@napplet/nap/class` and `@napplet/nap/connect` subpaths, and the `@napplet/vite-plugin` `connect` option; migrates the `shell.init` capabilities shape from `{ naps, sandbox }` to `{ domains, protocols }`.

## 0.7.0

### Minor Changes

- 06cfecf: Stop emitting the `napplet-aggregate-hash` meta tag into `index.html`. A file
  cannot contain a hash that covers itself (the hash includes `index.html`), so the
  tag was either empty or — when a signing key was set — written back _after_ the
  hash was computed, leaving the advertised hash permanently inconsistent with the
  file. It is also not a NIP-5D/5A artifact. The aggregate hash now lives only in
  the external `.nip5a-manifest.json` and the signed kind-35129 event, where the
  shell/relay reads it; removing the post-hash rewrite makes that manifest
  internally consistent.

## 0.6.0

### Minor Changes

- Align the generated napplet manifest with NIP-5D and the NIP-5A tag schema it adopts.

  - Emit NIP-5D's own kind `35129` (named napplet) instead of NIP-5A's nsite kind `35128`. New `NAPPLET_KIND_NAMED` / `NAPPLET_KIND_ROOT` / `NAPPLET_KIND_SNAPSHOT` exports replace the removed `SYNTHETIC_XTAG_PATHS` export.
  - Emit a NIP-5A-conformant manifest: one `["path", "/abs/path", "<sha256>"]` tag per file (absolute paths) plus a single aggregate `["x", "<aggregateHash>", "aggregate"]` tag, replacing the previous per-file `["x", hash, relpath]` projection.
  - Compute `aggregateHash` from the `path` tags alone (NIP-5D §Identity), so a runtime can recompute and verify it. `config` / `connect` capability tags are still emitted but are no longer folded into the aggregate; grant invalidation on a capability change is keyed on those tags at the shell layer.

  BREAKING: manifest output changes (kind, tag shape, aggregate inputs) and the `SYNTHETIC_XTAG_PATHS` export is removed.

## 0.5.0

### Minor Changes

- Rename the public package and protocol surface to NAP terminology, including `@napplet/nap`, `packages/nap`, `registerNap`, `nap:*`, and `NAP-*` identifiers.

## 0.4.0

### Minor Changes

- 73d5ffc: Add an explicit `artifactMode: 'single-file'` build contract for NIP-5A gateway-portable napplet artifacts. In single-file mode the plugin asks Vite/Rollup for a single-entry artifact shape, inlines local Vite JS/CSS assets into `index.html` before manifest/hash generation, fails if local external assets remain, accepts those build-produced inline module scripts intentionally, and keeps config/connect synthetic hash inputs participating in `aggregateHash`.

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

## 0.2.1

### Patch Changes

- Republish at 0.2.1 to ship resolved workspace dependency versions. The 0.2.0 tarballs on npm contained unresolved `workspace:*` specs in dependencies, breaking installs. This patch bump exists solely to produce correctly-assembled tarballs via `pnpm publish -r` (which rewrites `workspace:*` → concrete versions at pack time).
