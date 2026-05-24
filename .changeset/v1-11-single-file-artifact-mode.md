---
'@napplet/vite-plugin': minor
---

Add an explicit `artifactMode: 'single-file'` build contract for NIP-5A gateway-portable napplet artifacts. In single-file mode the plugin asks Vite/Rollup for a single-entry artifact shape, inlines local Vite JS/CSS assets into `index.html` before manifest/hash generation, fails if local external assets remain, accepts those build-produced inline module scripts intentionally, and keeps config/connect synthetic hash inputs participating in `aggregateHash`.
