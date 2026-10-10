---
"@napplet/conformance": patch
---

Remove the unused `@napplet/nap` dependency. The envelope drift guard reads the NAP sources from the workspace checkout; nothing in the published package imports `@napplet/nap`.
