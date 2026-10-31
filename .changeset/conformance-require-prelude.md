---
"@napplet/conformance": minor
---

`bootAndCollect` now requires `runtimePreludeSource`, the maintained `@napplet/shim` prelude IIFE. The hand-written fallback runtime fixture (embedded RESOURCE, GAMEPAD, and LLM bindings) is removed, so the harness installs exactly the bindings the maintained runtime provides for the explicit domain allowlist and never ships a second copy of any NAP binding.
