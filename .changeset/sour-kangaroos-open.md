---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
"@napplet/sdk": minor
"@napplet/conformance": minor
---

Add the NAP-SERIAL package surface.

This adds the `serial` NAP domain to core capability typing, exposes
`@napplet/nap/serial` types/shim/sdk/barrel subpaths, installs
`window.napplet.serial` through `@napplet/shim`, re-exports serial helpers from
`@napplet/sdk`, and teaches conformance validation/reference-shell handling
about `serial.open`, `serial.write`, `serial.close`, and `serial.event`.
