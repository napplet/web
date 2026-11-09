# RELAY

Low-level Nostr relay proxy — subscribe, publish, and one-shot query through the shell's relay pool. Use this only for explicit relay-local behavior such as a group relay, diagnostics, or protocol tooling. For normal social reads and publishes, use [`outbox`](./outbox) or a higher-level domain such as [`common`](./common), [`lists`](./lists), [`count`](./count), or [`dm`](./dm).

```ts
// Explicit relay-local subscription (returns a handle with .close())
const sub = window.napplet.relay.subscribe(
  [{ kinds: [9, 10, 11, 12], limit: 20 }],
  (result) => render(result.event),
  () => console.log('end of stored events'),
  { relay: 'wss://groups.example.com' },
);
```

This non-normative guide defers to the living [NAP-RELAY proposal](https://github.com/napplet/naps/pull/2). Feature-gate with `if (window.napplet?.relay)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/relay`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
