---
quick_id: 261120-c7t
status: complete
branch: fix/vite-plugin-drop-config-tag
---

# Retire the vite-plugin `config` manifest tag

NIP-5D (nips#2303 @ f60550c3) defines no `config` manifest tag. NAP-CONFIG (naps#14 @ bed9cb5b): "The current napplet manifest has no configuration schema field; callers MUST register a schema before requesting values" (changelog `36c209b`). The tag came from 5ff90f24 (2026-04), when an earlier NAP-CONFIG draft referenced an undefined manifest field.

Removed (rule 8): the tag, `configSchema` option, schema discovery (`config.schema.json`, `napplet.config.*`) and build-time validation (`config-schema.ts`), the type-only `@napplet/nap` dependency, and stale "manifest-declared schema" JSDoc in core/nap config. A leftover `configSchema` option warns.

Verification: build, type-check, pnpm -r test:unit, CLI deno tests (277), check:jsr, skills/protocol/agent-output, e2e 5/5, aislop 93/100.
