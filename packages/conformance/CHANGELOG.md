# @napplet/conformance

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
