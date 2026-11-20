---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": minor
---

Support NAP-WEBRTC byte payloads, delivery options, limits, and stats.

- `@napplet/nap/webrtc/types` adds `WebrtcSendBytesMessage` (`webrtc.sendBytes`, `id`, `sessionId`, `bytes`) to `WebrtcOutboundMessage` and `WebrtcSendBytesResultMessage` (`webrtc.sendBytes.result`, `id`, `error?`) to `WebrtcInboundMessage`.
- `window.napplet.webrtc.sendBytes(sessionId, bytes)`, `webrtc.sendBytes` in `@napplet/sdk`, and `webrtcSendBytes` / `sendBytes` in `@napplet/nap/webrtc` send canonical padded base64 text and reject with the shell's error (for example `unsupported`).
- `@napplet/core` adds `WebrtcBytes`, the `bytes` and `stats` members of `WebrtcEvent`, optional `ordered` / `maxRetransmits` on `WebrtcOpenRequest`, and optional `ordered` / `maxRetransmits` / `maxPayloadBytes` on `WebrtcSession`.
- The conformance validator knows `webrtc.sendBytes` (outbound, `bytes` string) and `webrtc.sendBytes.result`, and the reference shell acknowledges `webrtc.sendBytes`.
