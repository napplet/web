# GAMEPAD

### Controller snapshots

This non-normative guidance defers to [NAP-GAMEPAD](https://github.com/napplet/naps/pull/108). When the runtime exposes `window.napplet.gamepad`, the SDK provides cached `getGamepads()`, read-only `available` and `focused`, and `onChange(handler)` with an independently closable listener. Keep keyboard or pointer controls available when the domain or native controllers are unavailable. Ignore gameplay edges while unfocused, and reset the button baseline on regained focus. Preserve null slots and route controllers by their `index`.

```ts
import { gamepad } from '@napplet/sdk/gamepad';

if (window.napplet?.gamepad) {
  const subscription = gamepad.onChange(state => {
    if (!state.available || !state.focused) return;
    for (const pad of state.pads) {
      if (pad) console.log(pad.index, pad.axes);
    }
  });
  // Call subscription.close() when the owning view is disposed, not right away.
}
```

Declare `gamepad` as optional (`O`) when other controls fulfill the core task. Use a hard requirement (`R`) only when the core task needs controller input. The runtime owns controller access and focus isolation; app code does not call native `navigator.getGamepads()` or open raw HID devices. Haptics and remapping are outside this proposal.
