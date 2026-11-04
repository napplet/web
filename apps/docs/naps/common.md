# COMMON

Common social actions — public NIP-19 helpers, profile lookup, follows, follow/unfollow, reactions, and reports. The shell owns identity, consent, event construction, signing, publishing, relay access, and NIP-19 handling.

```ts
if (window.napplet?.common) {
  const { pubkeys } = await window.napplet.common.follows();
  await window.napplet.common.react(eventId, '+');
}
```

This non-normative guide defers to the living [NAP-COMMON proposal](https://github.com/napplet/naps/pull/67). Feature-gate with `if (window.napplet?.common)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/common`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
