---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/conformance": minor
---

Align relay and outbox read results with the current NAPs track: raw read events now use `RelayEventResult` with optional `sidecar.resources` and `sidecar.relayHints`, and NAP-OUTBOX no longer defines `outbox.eose`.
