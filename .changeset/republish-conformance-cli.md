---
"@napplet/conformance-cli": patch
---

Rebuild against `@napplet/conformance@0.1.1`. The CLI bundles the engine into
`cli.js` (and the host UI bundle), so it must be republished to pick up the
manifest-parsing fixes (HTML-entity-decoded config schema; aggregate-hash check
removed). No CLI behavior change of its own.
