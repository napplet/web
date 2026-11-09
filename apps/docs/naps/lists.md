# LISTS

Runtime-mediated NIP-51 list mutations. Napplets send add/remove intent while the runtime owns current-event lookup, kind/type mapping, tag formatting, private item encryption, event preservation, signing, and publishing.

```ts
if (window.napplet?.lists) {
  await window.napplet.lists.add({ type: 'mute-list' }, [
    { itemType: 'pubkey', value: 'abc123...' },
  ]);
}
```

This non-normative guide defers to the living [NAP-LISTS proposal](https://github.com/napplet/naps/pull/68). Feature-gate with `if (window.napplet?.lists)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/lists`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
