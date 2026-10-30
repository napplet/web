---
"@napplet/vite-plugin": patch
---

Add `screenshots`, `preview`, `sourceCommit` and `sourceArchive` options. Supplied media bytes are hashed, sized, format-sniffed and measured (PNG, JPEG, WebP headers), emitted as NIP-5D `screenshot` / `preview` tags in the sidecar, and written to `dist/<sha256>.<ext>` after the artifact hash is final. NIP-5D defines no head mapping for these tags, so nothing is embedded in `index.html`.
