---
"@napplet/vite-plugin": minor
---

Stop writing a `config` tag into napplet manifests. NIP-5D defines no such tag, and NAP-CONFIG says "The current napplet manifest has no configuration schema field; callers MUST register a schema before requesting values." The plugin no longer reads `configSchema`, `config.schema.json`, or `napplet.config.*`, and no longer validates a schema at build time. A leftover `configSchema` option is ignored with a warning.

Migration: call `window.napplet.config.registerSchema(schema)` (or `config.registerSchema` from `@napplet/sdk`) before `get()` / `subscribe()`.
