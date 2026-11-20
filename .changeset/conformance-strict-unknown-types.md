---
"@napplet/conformance": minor
"@napplet/conformance-cli": minor
---

Treat message types no known NAP defines as advisory and add a strict mode.

NIP-5D says "Messages with an unrecognized `type` MUST be silently ignored", so emitting one is not a napplet violation. `wire/envelope-well-formed` now fails only on malformed envelopes, and the new `wire/known-message-types` check warns about unknown domains and actions. `runConformance(context, { strict: true })`, `napplet-conformance --strict`, and the web runtime's `?strict=1` fail the run on any advisory warning; JUnit output counts those as failures under strict. `ConformanceRun` gains a `strict` field.
