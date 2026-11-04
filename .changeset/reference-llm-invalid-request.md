---
"@napplet/conformance": patch
"@napplet/conformance-cli": patch
---

The reference shell now answers a malformed but correlated NAP-LLM request with its `.result` carrying an `invalid-request` error, instead of silently discarding it. Uncorrelated envelopes, napplet-emitted results, and ungranted domains are still discarded.
