# @napplet/conformance-cli

## 0.2.12

### Patch Changes

- Updated dependencies [284e100]
  - @napplet/conformance@0.11.0

## 0.2.11

### Patch Changes

- Updated dependencies [c711a3e]
- Updated dependencies [ce41387]
- Updated dependencies [50b3c1b]
  - @napplet/conformance@0.10.0

## 0.2.10

### Patch Changes

- 688fb59: Align first-party packages with current NIP-5D runtime injection.

  Runtimes now expose available NAPs by injecting `window.napplet.<domain>`
  properties before napplet code runs. The retired generic shell capability
  surface is removed from active package APIs: no `window.napplet.shell`, no
  `shell.ready` / `shell.init` handshake, and no `@napplet/nap/shell` subpath.

  Conformance now injects the runtime namespace before fixture code and validates
  only NAP domain envelopes. Skills and package guidance now teach domain-property
  presence instead of the retired shell supports API.

- Updated dependencies [688fb59]
  - @napplet/conformance@0.9.1

## 0.2.9

### Patch Changes

- Updated dependencies [7e0c5bc]
  - @napplet/conformance@0.9.0

## 0.2.8

### Patch Changes

- Updated dependencies [b0e0c76]
  - @napplet/conformance@0.8.0

## 0.2.7

### Patch Changes

- Updated dependencies [c6f8645]
  - @napplet/conformance@0.7.0

## 0.2.6

### Patch Changes

- Updated dependencies [61431b7]
- Updated dependencies [086f36e]
  - @napplet/conformance@0.6.0

## 0.2.5

### Patch Changes

- Updated dependencies [5cb3187]
  - @napplet/conformance@0.5.0

## 0.2.4

### Patch Changes

- Updated dependencies [488ca0a]
  - @napplet/conformance@0.4.0

## 0.2.3

### Patch Changes

- Updated dependencies [6dcb2ac]
  - @napplet/conformance@0.3.0

## 0.2.2

### Patch Changes

- Resolve a napplet target to its built `dist/index.html` before a sibling source `index.html`.

  `napplet-conformance --ui .` (and `napplet-conformance .`) on a Vite **project root** previously served the source `index.html` — a Vite entry referencing `/src/*.ts` that cannot execute in the opaque-origin `srcdoc` sandbox — instead of the built single-file `dist/index.html`. The live UI runner then reported a spurious NON-CONFORMANT (no `napplet-type` meta, `window.napplet` never installed, no `shell.ready`) because it was testing the wrong, never-booting artifact.

  `resolveNappletDir` now prefers `<target>/dist/index.html` over `<target>/index.html`, so pointing the CLI at a project root tests its build output. A plain built directory (only `index.html`, no `dist/`) still resolves as before, and `--ui . --exec "vite build --watch"` now serves the built single-file while running the build in the project root.

## 0.2.1

### Patch Changes

- Stop rejecting inline `<script>` — it broke spec-faithful `srcdoc` napplets ([napplet/web#53](https://github.com/napplet/web/issues/53)).

  Per NIP-5D a napplet is a single self-contained `/index.html` loaded via `iframe.srcdoc` with `sandbox="allow-scripts"` and no `allow-same-origin` (an opaque origin). There is no served origin from which to fetch an external `<script src>`, so a napplet's executable JS **must** be inline. The toolchain was enforcing the opposite under an invented "shell-as-CSP-authority / `script-src 'self'`" model that NIP-5D never defines and that was justified by NAP-CONNECT/strict-CSP — since deferred from the NAPs track.

  - **`@napplet/vite-plugin`**: removed `assertNoInlineScripts` and its unconditional `closeBundle` call. The build no longer aborts on inline scripts; `artifactMode: 'single-file'` still folds local script/style assets into `index.html` and now preserves any pre-existing inline scripts verbatim.
  - **`@napplet/conformance`** (and bundled **`@napplet/conformance-cli`**): removed the `manifest/no-inline-scripts` check, the `inline-script` error code, and the `findInlineScripts` export. A conformant napplet that carries inline JS no longer fails conformance.

- Updated dependencies
  - @napplet/conformance@0.2.1

## 0.2.0

### Minor Changes

- b75880f: Align the SDK to the updated NAPs track ([github.com/napplet/naps](https://github.com/napplet/naps)).

  - **Defer NAP-CLASS and NAP-CONNECT.** Both are now inactive on the track, so the `class` and `connect` domains are removed from the active surface: `NAP_DOMAINS`/`NapDomain`, `window.napplet.class` / `window.napplet.connect`, the `@napplet/nap/class` + `@napplet/nap/connect` subpaths, the shim installers + sdk re-exports, the conformance validators/checks (incl. `manifest/connect-origins`), and the `@napplet/vite-plugin` `connect` option, manifest `connect` tags, and `napplet-connect-requires` meta. `NAP_DOMAINS` now has 14 entries.
  - **Implement NAP-SHELL** (mandatory, foundational). The `shell.ready` → `shell.init` bootstrap handshake is now a published NAP. `shell.init` carries `{ capabilities: { domains, protocols }, services, class }`. `window.napplet.shell` gains `services`, `class` (opaque integer), `ready(): Promise<ShellEnvironment>`, and `onReady(handler)` alongside `supports(domain, protocol?)`. A new `@napplet/nap/shell` subpath ships the NAP-SHELL types. The conformance engine recognizes `shell.ready`/`shell.init` as the foundational `shell` domain (dropping the previous special-case) and cites NAP-SHELL in its boot/degradation checks.

  BREAKING CHANGE: removes `window.napplet.class` / `window.napplet.connect`, the `@napplet/nap/class` and `@napplet/nap/connect` subpaths, and the `@napplet/vite-plugin` `connect` option; migrates the `shell.init` capabilities shape from `{ naps, sandbox }` to `{ domains, protocols }`.

### Patch Changes

- Updated dependencies [b75880f]
  - @napplet/conformance@0.2.0

## 0.1.1

### Patch Changes

- b705d67: Rebuild against `@napplet/conformance@0.1.1`. The CLI bundles the engine into
  `cli.js` (and the host UI bundle), so it must be republished to pick up the
  manifest-parsing fixes (HTML-entity-decoded config schema; aggregate-hash check
  removed). No CLI behavior change of its own.

## 0.1.0

### Minor Changes

- c8d0198: Initial release. Headless `napplet-conformance` runner that drives the
  `@napplet/conformance` engine against a napplet in real Chromium via Playwright:
  serves the built napplet (and the engine bundle) on loopback with permissive CORS,
  boots it into a `sandbox="allow-scripts"` iframe, records every emitted envelope,
  runs a graceful-degradation pass, then prints a `pretty`/`json`/`junit` report and
  exits non-zero on any error-severity failure. Wire it up as `test:conformance`.
  npm-only (Playwright dependency); the pure engine ships to both npm and JSR.

### Patch Changes

- Updated dependencies [c8d0198]
  - @napplet/conformance@0.1.0
