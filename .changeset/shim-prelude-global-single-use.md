---
"@napplet/shim": patch
---

Make the `prelude.global` activation global single-use. `globalThis.NappletShimPrelude` is now a configurable, non-enumerable property, and the first `install({ domains })` call deletes it before installing `window.napplet`. Napplet code that runs later can no longer call it to give itself extra domains (NIP-5D §Security: runtime injection is limited to the `window.napplet` namespace). The activation call shells render is unchanged.
