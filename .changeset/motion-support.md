---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/vite-plugin": minor
"@napplet/conformance": minor
"@napplet/conformance-cli": patch
---

Support the draft NAP-MOTION contract with typed permission requests, synchronous state and sample caches, independent listeners, and optional runtime injection. Add SDK and NAP subpaths, manifest inference, conformance fixtures, and sensor Permissions Policy on the test iframe. Clear cached samples when focus or grants no longer permit delivery.

The conformance shell reports sensors unavailable; production shells remain responsible for sensor access, grants, focus gating, and native sensor isolation. Native browser event APIs are unchanged.
