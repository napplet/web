---
"@napplet/vite-plugin": patch
"@napplet/cli": patch
---

Fix Node 22 pinned HTTPS lookups and keep optimizer asset inlining scoped to parser-proven references. Restore Deno CLI network deploys when callers rely on the runtime fetch implementation.
