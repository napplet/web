---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": minor
"@napplet/conformance-cli": patch
"@napplet/vite-plugin": patch
---

Align resource transport with the current NAP-RESOURCE proposal: bulk calls accept URL strings, wire blobs use canonical padded base64, and the web binding validates and decodes bytes into application-facing Blobs. Resource sidecars use the same validation before cache hydration. Data URLs now pass through shell policy.

Replace `bytesMany([{ url, servers }])` with `bytesMany([url])`. Remove `ResourceBytesRequest`, `opts.servers`, and `ResourceInfo.maxServers`; use BUD-10 URI hints when needed. Wire consumers use `ResourceBytes` and `ResourceBytesItem<ResourceBytes>`; application results retain `ResourceBytesItem` with decoded Blobs. Optimized assets use BUD-10 Blossom URIs and URL-list bulk calls.
