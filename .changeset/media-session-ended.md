---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": minor
---

Support NAP-MEDIA session retirement and transition reasons.

- `@napplet/nap/media/types` adds `MediaSessionEndedMessage` (`media.session.ended`, shell -> napplet, `sessionId`, `reason`) to `MediaResultMessage`, and an optional `reason` on `media.state` and `media.command`. `@napplet/core` exports `MediaSessionEnded` and adds `reason?` to `MediaState`.
- `window.napplet.media.onEnded(sessionId, callback)`, `media.onEnded` in `@napplet/sdk`, and `mediaOnEnded` in `@napplet/nap/media` deliver the retirement once. The binding retains the record until teardown, so a handler registered after retirement still receives it, and it drops later state, capability, control, and command messages for that session.
- `destroySession` keeps `onEnded` handlers registered until the shell's `media.session.ended` arrives.
- `sendCommand` takes an optional `reason`, `onCommand` callbacks receive `(action, value?, reason?)`, and `onState` passes `reason` through.
- The conformance validator knows `media.session.ended` as an inbound envelope, and the reference shell answers `media.session.destroy` with `media.session.ended` (`reason: "destroyed"`).
