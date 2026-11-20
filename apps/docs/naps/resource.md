# RESOURCE

Sandboxed byte fetching (`info() -> ResourceInfo`, `bytes(url, options?) -> Blob`, `bytesMany(urls) -> ResourceBytesItem[]`) over https / blossom ([BUD-10](https://github.com/hzrd149/blossom/blob/master/buds/10.md) `blossom:<sha256>.<ext>` URIs) / nostr / data schemes — the only network-fetch primitive available inside the iframe sandbox.

```ts
const info = await window.napplet.resource.info();
const blob = await window.napplet.resource.bytes('blossom:<sha256>.png?xs=cdn.hzrd149.com');
const items = await window.napplet.resource.bytesMany([
  'https://example.com/avatar.png',
  'blossom:<sha256>.png?xs=cdn.hzrd149.com',
]);

// Managed object URL — revoke when done to free memory
const { url, revoke } = window.napplet.resource.bytesAsObjectURL('blossom:<sha256>.png');
imgEl.src = url;
imgEl.onload = () => revoke();
```

Blossom discovery hints (`xs`, `as`, `sz`) travel inside the BUD-10 URI and stay advisory; there is no separate server list. `bytesMany` takes plain URL strings.

This non-normative guide defers to the living [NAP-RESOURCE proposal](https://github.com/napplet/naps/pull/80). Feature-gate with `if (window.napplet?.resource)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/resource`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
