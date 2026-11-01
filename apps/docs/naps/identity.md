# IDENTITY

Read-only user queries — pubkey, profile metadata, follows, … Never signs, encrypts, or decrypts.

```ts
const pubkey = await window.napplet.identity.getPublicKey();
const profile = await window.napplet.identity.getProfile();
const sub = window.napplet.identity.onChanged((pk) => reload(pk));
```

This non-normative guide defers to the living [NAP-IDENTITY proposal](https://github.com/napplet/naps/pull/102). Feature-gate with `if (window.napplet?.identity)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/identity`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).

## Changes and profile artwork

User identity changes report the connected signer, including an empty string at sign-out; they do not alter napplet identity. Profile picture and banner bytes use the optional [`resource`](./resource) domain when exposed; otherwise show local placeholder artwork. See the living [NAP-IDENTITY](https://github.com/napplet/naps/blob/master/naps/NAP-IDENTITY.md).
