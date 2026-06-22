# NAP-WEBRTC Quick Plan

## Source

Canonical contract: `napplet/naps` PR #59 (`NAP-WEBRTC: Define runtime-owned WebRTC signaling`).

## Scope

- Add `webrtc` to core NAP domain constants and global runtime types.
- Add `@napplet/nap/webrtc` barrel, `types`, `shim`, and `sdk` subpaths.
- Mount `window.napplet.webrtc` from `@napplet/shim`.
- Re-export WebRTC helpers/types from `@napplet/sdk`.
- Add conformance envelope validator entries and reference shell responses.
- Add focused shim tests.
- Update package/docs metadata and changesets.
- Run full verification and open a PR.

## Protocol Notes

- Do not expose raw SDP, ICE, signaling payloads, `RTCPeerConnection`, relay sockets, or signing keys.
- Keep the napplet API to `open`, `send`, `close`, and `onEvent`.
- Use `unknown` for application payloads; application semantics are out of scope for NAP-WEBRTC.
- `webrtc.event` is shell-initiated and has no correlation `id`.

## Verification

- `pnpm install --frozen-lockfile`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- local docs/site link check
- `npx --yes aislop scan -d`
- `git diff --check`
