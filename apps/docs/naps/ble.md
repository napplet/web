# BLE

Runtime-mediated Bluetooth LE/GATT sessions. Napplets receive opaque session ids and byte arrays while the shell owns chooser UI, permissions, device handles, GATT lifecycle, notifications, disconnects, and policy.

```ts
if (window.napplet?.ble) {
  const { session } = await window.napplet.ble.open({ acceptAllDevices: true });
  const services = await window.napplet.ble.services(session.id);
}
```

This non-normative guide defers to the living [NAP-BLE proposal](https://github.com/napplet/naps/pull/62). Feature-gate with `if (window.napplet?.ble)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/ble`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
