---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": minor
"@napplet/vite-plugin": patch
---

Add the draft NAP-LLM contract (napplet/naps#134) across types, domain helpers, runtime injection, SDK, manifest inference, and conformance tooling. The `llm` domain exposes `select`, `describe`, `generate`, and `cancel` for user-selected, runtime-mediated language model inference, with optional ordered `llm.delta` streaming, an exposed generation `requestId`, and abort-signal cancellation. Failures reject with the specification error code; unknown codes remain failures. Connections, credentials, disclosure consent, and provider access stay owned by the host runtime.
