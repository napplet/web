# @napplet/conformance-cli

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
