# WEBRTC

Runtime-mediated WebRTC sessions. The runtime owns signaling transport, signing and encryption, SDP, ICE, and the `RTCPeerConnection` lifecycle; napplets see only shell-scoped sessions — `direct` to one pubkey or a named `room` — and opaque application payloads delivered as `state`, `peer`, `message`, and `closed` events.

```ts
if (window.napplet?.webrtc) {
  const { session } = await window.napplet.webrtc.open({ scope: { type: 'direct', pubkey: '<hex pubkey>' } });
  const sub = window.napplet.webrtc.onEvent((event) => {
    if (event.type === 'message') handle(event.from, event.payload);
  });
  await window.napplet.webrtc.send(session.id, { move: 'e4' });
}
```

This non-normative guide defers to the living [NAP-WEBRTC proposal](https://github.com/napplet/naps/pull/59). Feature-gate with `if (window.napplet?.webrtc)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/webrtc`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
