# DM

Runtime-mediated direct messages. The napplet presents direct-message UI while the runtime owns signing, encryption, relay routing, storage, key and session state, and policy. The napplet sees normalized conversations, history pages, send results, and live message delivery through `status`, `conversations`, `messages`, `send`, `subscribe` / `unsubscribe`, and `onMessage`.

```ts
if (window.napplet?.dm) {
  const { conversations } = await window.napplet.dm.conversations({ limit: 20 });
  window.napplet.dm.onMessage((message) => render(message));
  await window.napplet.dm.subscribe();
  await window.napplet.dm.send({ recipients: ['<hex pubkey>'], content: 'hello' });
}
```

This non-normative guide defers to the living [NAP-DM proposal](https://github.com/napplet/naps/pull/74). Feature-gate with `if (window.napplet?.dm)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/dm`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
