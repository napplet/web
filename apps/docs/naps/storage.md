# STORAGE

Scoped key-value storage proxied through the shell — isolated per napplet identity.

```ts
await window.napplet.storage.setItem('draft', 'hello');
const draft = await window.napplet.storage.getItem('draft'); // string | null
const keys = await window.napplet.storage.keys();
```

This non-normative guide defers to the living [NAP-STORAGE proposal](https://github.com/napplet/naps/pull/3). Feature-gate with `if (window.napplet?.storage)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/storage`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
