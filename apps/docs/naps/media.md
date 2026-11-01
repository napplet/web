# MEDIA

Ownership-aware media sessions and playback control.

```ts
const { sessionId } = await window.napplet.media.createSession({
  owner: 'napplet',
  metadata: { title: 'My Song', artist: 'The Artist' },
});
window.napplet.media.reportState(sessionId, { status: 'playing', position: 0, duration: 240 });
window.napplet.media.onCommand(sessionId, (action) => { if (action === 'pause') player.pause(); });
```

This non-normative guide defers to the living [NAP-MEDIA proposal](https://github.com/napplet/naps/pull/10). Feature-gate with `if (window.napplet?.media)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/media`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
