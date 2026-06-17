# @napplet/conformance-cli

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
