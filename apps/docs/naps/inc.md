# INC

Inter-napplet communication — topic-based publish/subscribe between napplets.

```ts
// The INC binding accepts a developer-facing convention URI when emitting:
window.napplet.inc.emit('napplet:profile/open?pubkey=abc123');

// The runtime sends topic `napplet:profile/open` with { pubkey: 'abc123' }.
// Another napplet subscribes to that exact stable topic:
const sub = window.napplet.inc.on('napplet:profile/open', (event) => {
  // `event.sender` is supplied by the runtime from the authenticated source endpoint.
  const target = (event.payload as { pubkey?: string }).pubkey;
});
```

`emit(topic, payload?)` transposes unique percent-decoded query pairs into a shallow text payload before posting the normalized message. Literal `+` stays `+`. Consumers subscribe to the stable queryless topic, and routing then uses exact equality with no query-aware, wildcard, or prefix matching. Fragments, malformed percent encoding, duplicate decoded names, and query plus explicit payload reject. Use a queryless topic with an explicit payload for structured or non-text data.

This non-normative guide defers to the living [NAP-INC proposal](https://github.com/napplet/naps/pull/104). Feature-gate with `if (window.napplet?.inc)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/inc`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).

INC is defined by the living [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md) and its [web projection](https://github.com/napplet/naps/blob/master/projections/web.md). For URI-addressed handler routing, see [`intent`](./intent).
