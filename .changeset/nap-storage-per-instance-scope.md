---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
"@napplet/sdk": minor
---

Add per-instance storage scope (NAP-STORAGE, [github.com/napplet/naps](https://github.com/napplet/naps)). Resolves #57.

- Storage request messages (`storage.get`/`set`/`remove`/`keys`) gain an optional `scope?: 'shared' | 'instance'` field; `"shared"` is the default. Result messages are unchanged (no `scope`).
- New `window.napplet.storage.instance.*` surface (`getItem`/`setItem`/`removeItem`/`keys`) — sugar that sets `scope: "instance"` on the wire. Mirrored on `@napplet/sdk`'s `storage.instance.*` and as `storageInstance*` helpers in `@napplet/nap/storage` / `@napplet/sdk`. New `NappletInstanceStorage` type and `StorageScope` type exported.
- Fully backward compatible: top-level (shared) storage calls emit **no** `scope` field, so they remain byte-identical on the wire to prior versions.
