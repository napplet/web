# @napplet/conformance

## 0.3.1

### Patch Changes

- Updated dependencies [49b4660]
  - @napplet/core@0.15.0
  - @napplet/nap@0.15.0

## 0.3.0

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
  - @napplet/nap@0.14.0

## 0.2.2

### Patch Changes

- Updated dependencies [6c99508]
  - @napplet/core@0.13.0
  - @napplet/nap@0.13.0

## 0.2.1

### Patch Changes

- Stop rejecting inline `<script>` — it broke spec-faithful `srcdoc` napplets ([napplet/web#53](https://github.com/napplet/web/issues/53)).

  Per NIP-5D a napplet is a single self-contained `/index.html` loaded via `iframe.srcdoc` with `sandbox="allow-scripts"` and no `allow-same-origin` (an opaque origin). There is no served origin from which to fetch an external `<script src>`, so a napplet's executable JS **must** be inline. The toolchain was enforcing the opposite under an invented "shell-as-CSP-authority / `script-src 'self'`" model that NIP-5D never defines and that was justified by NAP-CONNECT/strict-CSP — since deferred from the NAPs track.

  - **`@napplet/vite-plugin`**: removed `assertNoInlineScripts` and its unconditional `closeBundle` call. The build no longer aborts on inline scripts; `artifactMode: 'single-file'` still folds local script/style assets into `index.html` and now preserves any pre-existing inline scripts verbatim.
  - **`@napplet/conformance`** (and bundled **`@napplet/conformance-cli`**): removed the `manifest/no-inline-scripts` check, the `inline-script` error code, and the `findInlineScripts` export. A conformant napplet that carries inline JS no longer fails conformance.

## 0.2.0

### Minor Changes

- b75880f: Align the SDK to the updated NAPs track ([github.com/napplet/naps](https://github.com/napplet/naps)).

  - **Defer NAP-CLASS and NAP-CONNECT.** Both are now inactive on the track, so the `class` and `connect` domains are removed from the active surface: `NAP_DOMAINS`/`NapDomain`, `window.napplet.class` / `window.napplet.connect`, the `@napplet/nap/class` + `@napplet/nap/connect` subpaths, the shim installers + sdk re-exports, the conformance validators/checks (incl. `manifest/connect-origins`), and the `@napplet/vite-plugin` `connect` option, manifest `connect` tags, and `napplet-connect-requires` meta. `NAP_DOMAINS` now has 14 entries.
  - **Implement NAP-SHELL** (mandatory, foundational). The `shell.ready` → `shell.init` bootstrap handshake is now a published NAP. `shell.init` carries `{ capabilities: { domains, protocols }, services, class }`. `window.napplet.shell` gains `services`, `class` (opaque integer), `ready(): Promise<ShellEnvironment>`, and `onReady(handler)` alongside `supports(domain, protocol?)`. A new `@napplet/nap/shell` subpath ships the NAP-SHELL types. The conformance engine recognizes `shell.ready`/`shell.init` as the foundational `shell` domain (dropping the previous special-case) and cites NAP-SHELL in its boot/degradation checks.

  BREAKING CHANGE: removes `window.napplet.class` / `window.napplet.connect`, the `@napplet/nap/class` and `@napplet/nap/connect` subpaths, and the `@napplet/vite-plugin` `connect` option; migrates the `shell.init` capabilities shape from `{ naps, sandbox }` to `{ domains, protocols }`.

### Patch Changes

- Updated dependencies [b75880f]
  - @napplet/core@0.12.0
  - @napplet/nap@0.12.0

## 0.1.1

### Patch Changes

- 06cfecf: Manifest validator fixes found by dogfooding against a real boilerplate build:
  - Decode HTML entities when reading `<meta>` content, so an escaped config schema
    (the build plugin serializes JSON with `&quot;`) parses the same way a real
    `getAttribute('content')` would — previously it failed as "not valid JSON".
  - Remove the `napplet-aggregate-hash` check entirely. A napplet cannot contain
    its own aggregate hash, and the tag is not a spec artifact; the shell computes
    the hash from the served files. The catalog drops to 13 checks.

## 0.1.0

### Minor Changes

- c8d0198: Initial release. Framework-agnostic napplet protocol conformance engine: hand-written
  per-NAP runtime envelope validators across all 16 NAP domains (drift-guarded against
  `@napplet/nap` source), a manifest/meta validator, a scriptable reference mock shell
  that records emitted envelopes and answers the `shell.ready`→`shell.init` handshake, a
  browser-safe boot harness (`bootAndCollect`), the zero-config conformance check
  catalog (`runConformance`), and `toPretty`/`toJson`/`toJUnit` reporters. Browser-safe
  and dependency-light so it can be reused by both the headless CLI and the web runtime.
