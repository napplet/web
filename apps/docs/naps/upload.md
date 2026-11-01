# UPLOAD

Shell-mediated file/blob upload over NIP-96 + Blossom rails; the shell signs auth and returns NIP-94 metadata.

```ts
if (window.napplet?.upload) {
  const info = await window.napplet.upload.info();
  const result = await window.napplet.upload.upload({ data: blob, filename: 'pic.png' });
  if (result.status === 'complete') attach(result.url, result.nip94);
}
```

This non-normative guide defers to the living [NAP-UPLOAD proposal](https://github.com/napplet/naps/pull/33). Feature-gate with `if (window.napplet?.upload)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/upload`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
