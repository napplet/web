---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": minor
"@napplet/vite-plugin": patch
"@napplet/conformance-cli": patch
---

Add the draft NAP-SOULSEEK contract (napplet/naps#135) across types, domain helpers, runtime injection, SDK, manifest inference, and conformance tooling. The `soulseek` domain exposes the fourteen request/result operations for runtime-mediated search, peer browsing, paginated immutable snapshots, endpoint-owned transfers, bounded base64 reads, user-mediated saving, and release. Failures reject with the specification error code; 64-bit byte counts travel as canonical decimal text. Accounts, peer networking, storage, content disclosure, and saving remain owned by the host runtime.
