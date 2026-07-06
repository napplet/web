# @napplet/conformance

## 0.12.2

### Patch Changes

- 5371643: Expose `resource.bytes` in the conformance reference runtime and support deterministic `data:` URL bytes.

## 0.12.1

### Patch Changes

- Updated dependencies [332f785]
  - @napplet/core@0.27.0
  - @napplet/nap@0.27.0

## 0.12.0

### Minor Changes

- 6ccb056: Align relay and outbox read results with the current NAPs track: raw read events now use `RelayEventResult` with optional `sidecar.resources` and `sidecar.relayHints`, and NAP-OUTBOX no longer defines `outbox.eose`.

### Patch Changes

- Updated dependencies [6ccb056]
  - @napplet/core@0.26.0
  - @napplet/nap@0.26.0

## 0.11.0

### Minor Changes

- 284e100: Add the NAP-COUNT `count` domain with `count.query` / `count.query.result` envelope types, `window.napplet.count.query(...)`, `@napplet/nap/count` subpaths, SDK exports, and conformance validator/reference-shell coverage.

### Patch Changes

- Updated dependencies [284e100]
  - @napplet/core@0.25.0
  - @napplet/nap@0.25.0

## 0.10.0

### Minor Changes

- c711a3e: Add NAP-OUTBOX `outbox.getEvent` support across the runtime API, typed NAP helpers, SDK wrappers, injected global, and conformance envelope/reference shell.
- ce41387: Add NAP-RESOURCE `resource.info` introspection across the runtime API, typed NAP helpers, SDK wrappers, injected global, and conformance envelope/reference shell.
- 50b3c1b: Add NAP-UPLOAD `upload.info` introspection across the runtime API, typed NAP helpers, SDK wrappers, injected global, and conformance envelope/reference shell.

### Patch Changes

- Updated dependencies [c711a3e]
- Updated dependencies [ce41387]
- Updated dependencies [50b3c1b]
  - @napplet/core@0.24.0
  - @napplet/nap@0.24.0

## 0.9.1

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
  - @napplet/core@0.23.0
  - @napplet/nap@0.23.0

## 0.9.0

### Minor Changes

- 7e0c5bc: Add NAP-DM as a runtime-mediated direct-message capability with typed payloads,
  `@napplet/nap/dm` subpath exports, `window.napplet.dm`, SDK wrappers, and
  conformance validator coverage.

### Patch Changes

- Updated dependencies [7e0c5bc]
  - @napplet/core@0.22.0
  - @napplet/nap@0.22.0

## 0.8.0

### Minor Changes

- b0e0c76: Add the NAP-RESOURCE `resource.bytesMany` bulk byte-fetch surface, including
  wire types, shim and SDK helpers, core global types, and conformance coverage.

### Patch Changes

- Updated dependencies [b0e0c76]
  - @napplet/core@0.21.0
  - @napplet/nap@0.21.0

## 0.7.0

### Minor Changes

- c6f8645: Add NAP-BLE package support with core types, `@napplet/nap/ble` subpaths, `window.napplet.ble`, SDK helpers, conformance validators, and reference-shell responses.

### Patch Changes

- Updated dependencies [c6f8645]
  - @napplet/core@0.20.0
  - @napplet/nap@0.20.0

## 0.6.0

### Minor Changes

- 086f36e: Implement the draft NAP-LISTS surface from napplet/naps#68.

  Adds the `lists` domain to `NapDomain`/`NAP_DOMAINS`, exposes
  `window.napplet.lists.supported/add/remove`, publishes the
  `@napplet/nap/lists` subpaths, re-exports SDK helpers and types, and teaches
  the conformance envelope validator/reference shell about the `lists.*` wire
  messages.

### Patch Changes

- 61431b7: Add NAP-COMMON common social actions.

  The new `common` domain exposes shell-mediated public NIP-19 encode/decode,
  profile lookup, follows, follow/unfollow, reactions, and reports. The shell owns
  identity, consent, event construction, signing, publishing, relay access, and
  NIP-19 handling.

- Updated dependencies [61431b7]
- Updated dependencies [086f36e]
  - @napplet/core@0.19.0
  - @napplet/nap@0.19.0

## 0.5.0

### Minor Changes

- 5cb3187: Add NAP-WEBRTC package support with core types, `@napplet/nap/webrtc` subpaths, `window.napplet.webrtc`, SDK helpers, conformance validators, and reference-shell responses.

### Patch Changes

- Updated dependencies [5cb3187]
  - @napplet/core@0.18.0
  - @napplet/nap@0.18.0

## 0.4.1

### Patch Changes

- 51b2ff1: Align NAP-INTENT availability with manifest-derived contracts from
  `napplet/naps` PR #55. Intent candidates now expose required `contracts`
  records, and the Vite plugin emits one archetype manifest tag per protocol with
  optional per-protocol `kind:<number>` constraints.
- ef8ad6b: Add the NAP-LINK shell-mediated link opening surface, including core types,
  `@napplet/nap/link` subpaths, `window.napplet.link`, SDK helpers, and
  conformance/reference-shell support.
- Updated dependencies [51b2ff1]
- Updated dependencies [ef8ad6b]
  - @napplet/core@0.17.0
  - @napplet/nap@0.17.0

## 0.4.0

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
  - @napplet/nap@0.16.0

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
