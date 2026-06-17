---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
"@napplet/sdk": minor
"@napplet/vite-plugin": minor
"@napplet/conformance": minor
"@napplet/conformance-cli": minor
---

Align the SDK to the updated NAPs track ([github.com/napplet/naps](https://github.com/napplet/naps)).

- **Defer NAP-CLASS and NAP-CONNECT.** Both are now inactive on the track, so the `class` and `connect` domains are removed from the active surface: `NAP_DOMAINS`/`NapDomain`, `window.napplet.class` / `window.napplet.connect`, the `@napplet/nap/class` + `@napplet/nap/connect` subpaths, the shim installers + sdk re-exports, the conformance validators/checks (incl. `manifest/connect-origins`), and the `@napplet/vite-plugin` `connect` option, manifest `connect` tags, and `napplet-connect-requires` meta. `NAP_DOMAINS` now has 14 entries.
- **Implement NAP-SHELL** (mandatory, foundational). The `shell.ready` → `shell.init` bootstrap handshake is now a published NAP. `shell.init` carries `{ capabilities: { domains, protocols }, services, class }`. `window.napplet.shell` gains `services`, `class` (opaque integer), `ready(): Promise<ShellEnvironment>`, and `onReady(handler)` alongside `supports(domain, protocol?)`. A new `@napplet/nap/shell` subpath ships the NAP-SHELL types. The conformance engine recognizes `shell.ready`/`shell.init` as the foundational `shell` domain (dropping the previous special-case) and cites NAP-SHELL in its boot/degradation checks.

BREAKING CHANGE: removes `window.napplet.class` / `window.napplet.connect`, the `@napplet/nap/class` and `@napplet/nap/connect` subpaths, and the `@napplet/vite-plugin` `connect` option; migrates the `shell.init` capabilities shape from `{ naps, sandbox }` to `{ domains, protocols }`.
