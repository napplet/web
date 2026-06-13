---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
"@napplet/sdk": minor
---

Add NAP-OUTBOX, outbox-aware relay routing. Napplets can now query, subscribe,
publish, and resolve relay plans through `window.napplet.outbox` while the
runtime owns relay discovery, NIP-65 routing, fallback, deduplication, signature
validation, and publish fanout.

- `@napplet/core`: `outbox` domain added to `NapDomain`/`NAP_DOMAINS`, `outbox`
  surface added to `NappletGlobal`, plus the outbox value types.
- `@napplet/nap`: new `@napplet/nap/outbox` domain (types/shim/sdk subpaths) with
  request/response correlation and an event-emitter subscription handle.
- `@napplet/shim`: mounts `window.napplet.outbox` and routes `outbox.*` envelopes.
- `@napplet/sdk`: `outbox` namespace, `outbox*` helpers, and OUTBOX type re-exports.
