---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
"@napplet/sdk": minor
"@napplet/conformance": minor
"@napplet/conformance-cli": patch
"@napplet/vite-plugin": minor
---

Support the NAP-NAVIGATION draft with typed report/get APIs, runtime injection, SDK and NAP subpaths, manifest requirement inference, and endpoint-scoped reference history. The conformance runtime validates advertised invocation parameters, preserves revision ordering, and revisits retained entries through correlated intent deliveries. Browser and CLI conformance runs bind navigation eligibility to the host-verified manifest.

Implement the companion NAP-INTENT delivery draft: `IntentDelivery.id` is now required and `sender` accepts `null` for shell-originated requests. Runtime integrations must assign a non-reused delivery ID within each target endpoint lifetime, preserve it on retries, and derive sender provenance themselves. This is a breaking pre-1.0 contract change.

These interfaces follow the published drafts in napplet/naps#126 and napplet/naps#128; they remain subject to upstream revision.
