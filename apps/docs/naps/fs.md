# FS

Shell-mediated virtual filesystem access. Napplets discover visible roots, ask the runtime to mediate file and directory selection, inspect and list entries, read and write base64-encoded file bytes, create, remove and move them, and subscribe to advisory change events. The runtime owns host paths, mounts, backing store, normalization, policy, and authorization — the napplet sees only virtual paths.

`info()` is advisory discovery, not an authorization token: permissions can change mid-session and any operation can still fail.

```ts
if (window.napplet?.fs) {
  const picked = await window.napplet.fs.pickFile({ accept: [{ extension: '.md' }] });
  const bytes = await window.napplet.fs.read(picked.entries[0].path);
  await window.napplet.fs.write('/shared/copy.md', bytes.data, { mode: 'replace' });
  const entries = await window.napplet.fs.list('/shared');
  const watchId = await window.napplet.fs.watch('/shared', { recursive: true });
  window.napplet.fs.onChanged((change) => refresh(change.path));
}
```

`fs.write.data` and `FsReadResult.data` carry bytes as RFC 4648 standard padded base64 text on the JSON wire. Byte limits and result counts are decoded-byte counts.

This non-normative guide defers to the living [NAP-FS proposal](https://github.com/napplet/naps/pull/88). Feature-gate with `if (window.napplet?.fs)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/fs`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
