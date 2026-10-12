import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GamepadState } from './types.js';

// Connected and neutral examples from NAP-GAMEPAD Wire Protocol, proposal #108.
const focused: GamepadState = {
  available: true, focused: true,
  pads: [null, {
    index: 1, id: 'Xbox Wireless Controller', mapping: 'standard', connected: true,
    timestamp: 18235.4, axes: [0, -1, 0, 0],
    buttons: [{ value: 1, pressed: true, touched: true }, { value: 0, pressed: false, touched: false }],
  }],
};
const neutral: GamepadState = {
  ...focused, focused: false,
  pads: [null, { ...focused.pads[1]!, timestamp: 0, axes: [0, 0, 0, 0], buttons: [{ value: 0, pressed: false, touched: false }, { value: 0, pressed: false, touched: false }] }],
};

let post: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules();
  post = vi.fn();
  vi.stubGlobal('window', { parent: { postMessage: post } });
});
afterEach(() => vi.unstubAllGlobals());

describe('NAP-GAMEPAD cached binding', () => {
  it('starts neutral and subscribes once with no correlation id', async () => {
    const shim = await import('./shim.js');
    const cleanup = shim.installGamepadShim();
    const duplicate = shim.installGamepadShim();
    expect(shim.gamepad.available).toBe(true);
    expect(shim.gamepad.focused).toBe(false);
    expect(shim.getGamepads()).toEqual([]);
    expect(post.mock.calls).toEqual([[{ type: 'gamepad.subscribe' }, '*']]);
    duplicate();
    expect(post).toHaveBeenCalledTimes(1);
    cleanup(); cleanup();
    expect(post.mock.calls[1]).toEqual([{ type: 'gamepad.unsubscribe' }, '*']);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('preserves empty slots, indexes and complete focused/neutral/blocked states', async () => {
    const shim = await import('./shim.js');
    const handler = vi.fn();
    const cleanup = shim.installGamepadShim();
    shim.onChange(handler);
    for (const state of [focused, neutral, { available: false, reason: 'blocked', focused: false, pads: [] }]) {
      shim.handleGamepadMessage({ type: 'gamepad.state', ...state });
      expect(handler).toHaveBeenLastCalledWith(state);
      expect(shim.gamepad.available).toBe(state.available);
      expect(shim.gamepad.focused).toBe(state.focused);
      expect(shim.getGamepads()).toEqual(state.pads);
    }
    expect(post).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('copies nested input separately for readers and each listener', async () => {
    const shim = await import('./shim.js');
    const cleanup = shim.installGamepadShim();
    shim.onChange((state) => { state.pads[1]!.axes[1] = 0; state.pads[1]!.buttons[0].pressed = false; });
    const other = vi.fn();
    shim.onChange(other);
    shim.handleGamepadMessage({ type: 'gamepad.state', ...focused });
    const read = shim.getGamepads();
    read[1]!.axes[1] = 1;
    expect(other).toHaveBeenCalledWith(focused);
    expect(shim.getGamepads()).toEqual(focused.pads);
    cleanup();
  });

  it('gives repeated handlers independent, idempotent subscription handles', async () => {
    const shim = await import('./shim.js');
    const handler = vi.fn();
    const first = shim.onChange(handler);
    const second = shim.onChange(handler);
    first.close(); first.close();
    shim.handleGamepadMessage({ type: 'gamepad.state', ...focused });
    expect(handler).toHaveBeenCalledTimes(1);
    second.close();
    const third = shim.onChange(handler);
    first.close();
    shim.handleGamepadMessage({ type: 'gamepad.state', ...neutral });
    expect(handler).toHaveBeenCalledTimes(2);
    third.close();
  });

  it('defers listeners added during delivery until the next snapshot', async () => {
    const shim = await import('./shim.js');
    const later = vi.fn();
    const first = shim.onChange(() => { first.close(); shim.onChange(later); });
    shim.handleGamepadMessage({ type: 'gamepad.state', ...focused });
    expect(later).not.toHaveBeenCalled();
    shim.handleGamepadMessage({ type: 'gamepad.state', ...neutral });
    expect(later).toHaveBeenCalledExactlyOnceWith(neutral);
  });

  it('ignores malformed snapshots, request envelopes and state after cleanup', async () => {
    const shim = await import('./shim.js');
    const cleanup = shim.installGamepadShim();
    const handler = vi.fn();
    shim.onChange(handler);
    for (const message of [
      { type: 'gamepad.subscribe' },
      { type: 'gamepad.state', ...focused, id: 'forbidden' },
      { type: 'gamepad.state', ...focused, focused: false },
      { type: 'gamepad.state', available: false, focused: false, pads: [] },
      { type: 'gamepad.state', ...focused, pads: [false] },
    ]) shim.handleGamepadMessage(message);
    expect(handler).not.toHaveBeenCalled();
    cleanup();
    shim.handleGamepadMessage({ type: 'gamepad.state', ...focused });
    expect(handler).not.toHaveBeenCalled();
    const nextCleanup = shim.installGamepadShim();
    expect(shim.gamepad.focused).toBe(false);
    expect(shim.getGamepads()).toEqual([]);
    nextCleanup();
  });

  it('checks schema bounds without restricting future mapping strings', async () => {
    const { isGamepadState } = await import('./state.js');
    expect(isGamepadState(focused)).toBe(true);
    expect(isGamepadState(neutral)).toBe(true);
    expect(isGamepadState({ ...focused, pads: [{ ...focused.pads[1], mapping: 'future-layout' }] })).toBe(true);
    for (const axis of [-2, 2, NaN, Infinity]) expect(isGamepadState({ ...focused, pads: [{ ...focused.pads[1], axes: [axis] }] })).toBe(false);
    expect(isGamepadState({ ...focused, reason: 'blocked' })).toBe(false);
    expect(isGamepadState({ available: false, reason: 'unavailable', focused: false, pads: [] })).toBe(true);
  });
});
