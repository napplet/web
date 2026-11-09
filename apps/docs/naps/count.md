# COUNT

Runtime-mediated aggregate counts for NIP-01 filters. The runtime owns relay COUNT support, indexes, caches, approximation, relay disclosure, and refusal policy. A result carries `ok`, and when available `count`, an `approximate` flag, an `hll` value, and the `relays` consulted.

```ts
if (window.napplet?.count) {
  const result = await window.napplet.count.query({ kinds: [7], '#e': [eventId] });
  if (result.ok) showReactions(result.count, result.approximate);
}
```

This non-normative guide defers to the living [NAP-COUNT proposal](https://github.com/napplet/naps/pull/69). Feature-gate with `if (window.napplet?.count)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/count`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
