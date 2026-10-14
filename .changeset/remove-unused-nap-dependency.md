---
"@napplet/conformance": patch
---

Move `@napplet/nap` from runtime dependencies to devDependencies. The envelope drift guard reads NAP sources from the workspace checkout, so the development dependency preserves Turbo cache invalidation for NAP-only changes. Nothing in the published package imports `@napplet/nap`.
