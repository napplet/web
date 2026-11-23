---
quick_id: 261120-k4r
status: complete
commits: [b8d99c78, d0a743d4, db7caeb8]
---

# NAP-RESOURCE wire bytes and data: URL conformance — Summary

Against NAP-RESOURCE napplet/naps#80 @ ae5b9c64 and projections/web.md §Resource binding at the same ref.

- Wire `blob` fields are canonical base64 `ResourceBytes`; the shim strictly validates and decodes them into Blobs typed with `mime`. Non-canonical text, Blob, ArrayBuffer, and arrays reject. `bytesMany` rejects the whole call on bad encoding, bad item shape, or length mismatch. Sidecar entries with bad encoding are skipped, never cached.
- `data:`, bare `nhash`, and malformed URLs go to the runtime (no in-shim decode, no `new URL()` pre-parse).
- `ResourceScheme` gains `hashtree`. Reference shell emits base64.
- Conformance validator untouched: it validates napplet-emitted envelopes only, so inbound encoding checks have no home there.

Verification: build, type-check, `pnpm -r test:unit` (nap 444, conformance 475, …), check:jsr, test:skills-contracts, test:protocol, test:agent-output green; aislop 93/100 (dependency advisories only, same as main).

Deviation: planner/executor agents were not spawned. The plan was settled inline (with advisor review) and executed directly.
