# SERIAL

Runtime-mediated serial device access. A napplet asks the shell to select and open a user-approved serial session, writes byte arrays to it, and receives shell-pushed `state`, `data`, and `closed` events. The shell owns device selection, permissions, raw port handles, streams, OS paths, read loops, and lifecycle policy.

```ts
if (window.napplet?.serial) {
  const { session } = await window.napplet.serial.open({ options: { baudRate: 115200 } });
  const sub = window.napplet.serial.onEvent((event) => {
    if (event.type === 'data') append(event.data);
  });
  await window.napplet.serial.write(session.id, [112, 105, 110, 103, 10]);
}
```

This non-normative guide defers to the living [NAP-SERIAL proposal](https://github.com/napplet/naps/pull/61). Feature-gate with `if (window.napplet?.serial)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/serial`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
