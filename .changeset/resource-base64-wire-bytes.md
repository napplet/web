---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": minor
---

Follow NAP-RESOURCE canonical base64 wire bytes and stop decoding `data:` URLs in the shim.

Every wire `blob` (`resource.bytes.result`, `resource.bytesMany.result` items, and `ResourceSidecarEntry`) is now canonical padded base64 text (`ResourceBytes`). The shim strictly validates it and decodes it into a `Blob` typed with the runtime-classified `mime`, so `window.napplet.resource.bytes()` / `bytesMany()` still return Blobs. A non-canonical encoding, a `Blob`, an `ArrayBuffer`, or an integer array on the wire rejects the call, and bad sidecar entries are skipped instead of cached.

`data:` URLs, bare `nhash` aliases, and malformed URLs now go to the runtime, which applies the size cap, MIME sniffing, and SVG rasterization NAP-RESOURCE requires and answers with `invalid-request` where needed. `ResourceScheme` gains `hashtree`, and the conformance reference shell answers with base64.

Migration for shells: send `blob: btoa(binary)`-style canonical base64 instead of a `Blob`, for example `{ type: 'resource.bytes.result', id, blob: 'AAEC/w==', mime: 'application/octet-stream' }`.

Napplets reading `RelayEventResult.sidecar.resources` directly now see base64 text in `blob`, and entries that failed decoding are removed from the result. Call `window.napplet.resource.bytes(url)` instead: hydrated URLs resolve from cache as Blobs without a round-trip.
