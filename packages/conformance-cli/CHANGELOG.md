# @napplet/conformance-cli

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
