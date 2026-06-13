---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
"@napplet/sdk": minor
---

Add NAP-CVM, the native ContextVM bridge. Napplets can now discover ContextVM
servers and run MCP operations (`tools/list`, `tools/call`, `resources/list`,
`resources/read`) over Nostr through the shell via `window.napplet.cvm`, while
the runtime owns all ContextVM transport — relay routing, signing, encryption,
JSON-RPC correlation, initialization, policy, and optional payment prompts.

- `@napplet/core`: `cvm` domain added to `NapDomain`/`NAP_DOMAINS`, `cvm`
  surface added to `NappletGlobal`, plus MCP and ContextVM value types.
- `@napplet/nap`: new `@napplet/nap/cvm` domain (types/shim/sdk subpaths).
- `@napplet/shim`: mounts `window.napplet.cvm` and routes `cvm.*` envelopes.
- `@napplet/sdk`: `cvm` namespace, `cvm*` helpers, and CVM type re-exports.
