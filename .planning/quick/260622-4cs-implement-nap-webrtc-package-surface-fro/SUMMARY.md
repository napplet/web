# NAP-WEBRTC Quick Summary

## Result

Implemented the NAP-WEBRTC package surface from `napplet/naps` PR #59.

- Added `webrtc` to core NAP domain constants, type exports, and `window.napplet` global types.
- Added `@napplet/nap/webrtc`, `@napplet/nap/webrtc/types`, `@napplet/nap/webrtc/shim`, and `@napplet/nap/webrtc/sdk`.
- Mounted `window.napplet.webrtc` through `@napplet/shim`.
- Re-exported WebRTC helpers and types through `@napplet/sdk`.
- Added conformance envelope entries and reference-shell responders for `webrtc.open`, `webrtc.send`, `webrtc.close`, and `webrtc.event`.
- Updated docs, package metadata, JSR exports, and changeset release metadata.

## Protocol Boundaries

- Implemented only `open`, `send`, `close`, and `onEvent`.
- Kept raw SDP, ICE, NIP-100 signaling payloads, relay sockets, signing keys, and `RTCPeerConnection` out of the napplet-facing API.
- Treated payloads as application-owned `unknown` values; application protocol semantics remain out of scope.

## Verification

- `pnpm install --lockfile-only`
- `pnpm install --frozen-lockfile`
- `node -e "const p=require('./packages/nap/package.json'); console.log(Object.keys(p.exports).length)"` -> `68`
- stale docs scan: no matches
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- local link check: 18 internal URLs, no broken links
- `npx --yes aislop scan -d` -> `98 / 100`, inherited `js-yaml` warning only
- `git diff --check`

## Remaining Risk

No real WebRTC runtime, peer, or backend signaling integration was exercised; this branch covers the package surface, shim/SDK routing, type surface, conformance envelope validation, and reference-shell behavior.
