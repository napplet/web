import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gamepad } from '@napplet/sdk/gamepad';
import { gamepad as rootGamepad, GAMEPAD_DOMAIN, gamepadGetGamepads } from '@napplet/sdk';

test('built root and gamepad subpath delegate to the current injected domain', () => {
  assert.equal(GAMEPAD_DOMAIN, 'gamepad');
  assert.equal(rootGamepad, gamepad);
  const previous = globalThis.window;
  let handler;
  const pads = [null];
  const runtime = {
    available: true, focused: false,
    getGamepads: () => pads,
    onChange: (callback) => { handler = callback; return { close: () => { handler = undefined; } }; },
  };
  try {
    globalThis.window = { napplet: { gamepad: runtime } };
    assert.equal(gamepad.getGamepads(), pads);
    assert.equal(gamepadGetGamepads(), pads);
    assert.equal(gamepad.available, true);
    runtime.focused = true;
    assert.equal(gamepad.focused, true);
    const callback = () => {};
    const sub = gamepad.onChange(callback);
    assert.equal(handler, callback);
    sub.close();
    assert.equal(handler, undefined);
    globalThis.window.napplet = {};
    assert.throws(() => gamepad.getGamepads(), /gamepad/);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
