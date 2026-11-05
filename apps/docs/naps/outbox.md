# OUTBOX

Outbox-aware relay routing — `getEvent` / `query` / `subscribe` / `publish` / `resolveRelays`; the shell owns NIP-65 relay discovery, fallback, dedup, signature validation, signing, and fanout. This is the default event-read and publish boundary when relay selection is part of result correctness.

```ts
if (window.napplet?.outbox) {
  await window.napplet.outbox.getEvent('ev1…', { author: 'ab12…' });
  const { events } = await window.napplet.outbox.query(
    [{ authors: ['ab12…'], kinds: [1], limit: 20 }],
    { authors: ['ab12…'], timeoutMs: 3000 },
  );
  const sub = window.napplet.outbox.subscribe(
    [{ authors: ['ab12…'], kinds: [1], limit: 20 }],
    { authors: ['ab12…'], timeoutMs: 3000 },
  );
  sub.on('event', (result) => render(result.event, result.sidecar?.relayHints));

  await window.napplet.outbox.publish({
    kind: 1,
    content: 'gm',
    tags: [],
    created_at: Math.floor(Date.now() / 1000),
  });
}
```

This non-normative guide defers to the living [NAP-OUTBOX proposal](https://github.com/napplet/naps/pull/32). Feature-gate with `if (window.napplet?.outbox)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/outbox`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
