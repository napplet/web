# RESOURCE

Sandboxed byte fetching (`info() -> ResourceInfo`, `bytes(url, options?) -> Blob`, `bytesMany(urls) -> ResourceBytesItem[]`) over https / blossom ([BUD-10](https://github.com/hzrd149/blossom/blob/master/buds/10.md) `blossom:<sha256>.<ext>` URIs) / htree and hashtree / nostr / data schemes — the only network-fetch primitive available inside the iframe sandbox.

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

Every URL, including `data:`, is resolved by the runtime, which owns size caps, MIME sniffing, and SVG rasterization. On the wire each `blob` is canonical padded base64; the shim validates it and hands you a `Blob` typed with the sniffed MIME. A malformed encoding rejects the call instead of resolving with bad bytes.

This non-normative guide defers to the living [NAP-RESOURCE proposal](https://github.com/napplet/naps/pull/80). Feature-gate with `if (window.napplet?.resource)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/resource`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
