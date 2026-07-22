---
"@napplet/cli": patch
---

Run the default conformance tool through its npm package instead of requiring a
global `napplet-conformance` executable, and preserve Kehto's managed-command
separator when `napplet paja` wraps a local app server.
