# WEBRTC

Runtime-mediated WebRTC sessions. The runtime owns signaling transport, signing and encryption, SDP, ICE, and the `RTCPeerConnection` lifecycle; napplets see only shell-scoped sessions — `direct` to one pubkey or a named `room` — and opaque application payloads delivered as `state`, `peer`, `message`, `bytes`, `stats`, and `closed` events.

```ts
if (window.napplet?.webrtc) {
  const { session } = await window.napplet.webrtc.open({ scope: { type: 'direct', pubkey: '<hex pubkey>' } });
  const sub = window.napplet.webrtc.onEvent((event) => {
    if (event.type === 'message') handle(event.from, event.payload);
  });
  await window.napplet.webrtc.send(session.id, { move: 'e4' });
}
```

`sendBytes(sessionId, bytes)` sends one opaque byte sequence as canonical padded base64 text (bytes `00 01 02 ff` are `"AAEC/w=="`); peers receive it as a `bytes` event, never as `message`. A shell without byte payloads rejects with `unsupported`, and one that predates the operation never answers, so fall back to `send` when the request fails or times out. `open` accepts optional `ordered` and `maxRetransmits` for lossy or unordered channels; the returned session reports the semantics the shell actually established, plus an optional `maxPayloadBytes` limit. `stats` events are advisory, so don't depend on them. `from` and `pubkey` name the key the shell authenticated during signaling, which may be a temporary key rather than the user's usual profile.

This non-normative guide defers to the living [NAP-WEBRTC proposal](https://github.com/napplet/naps/pull/59). Feature-gate with `if (window.napplet?.webrtc)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/webrtc`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
