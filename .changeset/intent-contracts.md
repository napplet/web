---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": patch
"@napplet/vite-plugin": minor
---

Align NAP-INTENT availability with manifest-derived contracts from
`napplet/naps` PR #55. Intent candidates now expose required `contracts`
records, and the Vite plugin emits one archetype manifest tag per protocol with
optional per-protocol `kind:<number>` constraints.
