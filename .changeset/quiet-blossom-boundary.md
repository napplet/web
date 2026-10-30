---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": minor
"@napplet/conformance-cli": patch
"@napplet/vite-plugin": patch
---

Add support for the proposed NAP-BLOSSOM domain: typed blob operations, ordered BUD-03 server-list helpers, local BUD-10 URI helpers, optional runtime injection and SDK subpath exports. Conformance validates Blossom request envelopes and provides deterministic unavailable responses without network or signing access. Vite requirement inference recognizes Blossom imports while preserving explicit optional declarations.
