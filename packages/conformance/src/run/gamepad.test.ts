// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import type { GamepadApi } from '@napplet/core';
import { createGamepadStateTools } from '@napplet/nap/gamepad';
import { GAMEPAD_STATE_TOOLS_SOURCE, runtimePrelude } from './boot.js';

describe('serialized GAMEPAD conformance binding', () => {
  it('installs before subject code, accepts only parent state and isolates cached data', () => {
    const previous = window.parent;
    const post = vi.fn();
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage: post } });
    try {
      Function(runtimePrelude(['gamepad']))();
      const api = (window as unknown as { napplet: { gamepad: GamepadApi } }).napplet.gamepad;
      expect(api.available).toBe(true);
      expect(api.focused).toBe(false);
      expect(api.getGamepads()).toEqual([]);
      expect(post.mock.calls).toEqual([[{ type: 'gamepad.subscribe' }, '*']]);
      const handler = vi.fn();
      const sub = api.onChange(handler);
      const state = { type: 'gamepad.state', available: false, focused: false, reason: 'blocked', pads: [] };
      window.dispatchEvent(new MessageEvent('message', { data: state, source: {} as MessageEventSource }));
      expect(handler).not.toHaveBeenCalled();
      window.dispatchEvent(new MessageEvent('message', { data: state, source: window.parent }));
      expect(api.available).toBe(false);
      expect(handler).toHaveBeenCalledExactlyOnceWith({ available: false, focused: false, reason: 'blocked', pads: [] });
      sub.close();
      window.dispatchEvent(new MessageEvent('message', { data: state, source: window.parent }));
      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'parent', { configurable: true, value: previous });
      delete (window as unknown as { napplet?: unknown }).napplet;
    }
  });

  it('isolates a throwing onChange listener from later listeners', () => {
    const previous = window.parent;
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage: vi.fn() } });
    const reported = vi.fn();
    vi.stubGlobal('queueMicrotask', reported);
    try {
      Function(runtimePrelude(['gamepad']))();
      const api = (window as unknown as { napplet: { gamepad: GamepadApi } }).napplet.gamepad;
      api.onChange(() => { throw new Error('listener failed'); });
      const later = vi.fn();
      api.onChange(later);
      const state = { available: false, focused: false, reason: 'blocked', pads: [] };
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'gamepad.state', ...state }, source: window.parent }));
      expect(later).toHaveBeenCalledExactlyOnceWith(state);
      expect(reported).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
      Object.defineProperty(window, 'parent', { configurable: true, value: previous });
      delete (window as unknown as { napplet?: unknown }).napplet;
    }
  });
});

describe('literal GAMEPAD state tools source', () => {
  // Connected and neutral examples from NAP-GAMEPAD Wire Protocol, proposal #108.
  const pad = {
    index: 1, id: 'Xbox Wireless Controller', mapping: 'standard', connected: true,
    timestamp: 18235.4, axes: [0, -1, 0, 0],
    buttons: [{ value: 1, pressed: true, touched: true }, { value: 0, pressed: false, touched: false }],
  };
  const focused = { available: true, focused: true, pads: [null, pad] };
  const neutralPad = { ...pad, timestamp: 0, axes: [0, 0, 0, 0], buttons: [{ value: 0, pressed: false, touched: false }, { value: 0, pressed: false, touched: false }] };
  const neutral = { available: true, focused: false, pads: [null, neutralPad] };
  const vectors: unknown[] = [
    focused, neutral, null, [], 'state',
    { available: false, reason: 'blocked', focused: false, pads: [] },
    { available: false, reason: 'unavailable', focused: false, pads: [] },
    { available: false, focused: false, pads: [] },
    { available: false, reason: 'other', focused: false, pads: [] },
    { available: false, reason: 'blocked', focused: true, pads: [] },
    { ...focused, reason: 'blocked' },
    { ...focused, focused: false },
    { ...focused, pads: [false] },
    { ...focused, pads: [{ ...pad, mapping: 'future-layout' }] },
    { ...focused, pads: [{ ...pad, index: -1 }] },
    { ...focused, pads: [{ ...pad, index: 1.5 }] },
    { ...focused, pads: [{ ...pad, connected: false }] },
    { ...focused, pads: [{ ...pad, timestamp: Infinity }] },
    ...[-2, 2, NaN, Infinity].map((axis) => ({ ...focused, pads: [{ ...pad, axes: [axis] }] })),
    { ...focused, pads: [{ ...pad, buttons: [{ value: 2, pressed: true, touched: true }] }] },
    { ...focused, pads: [{ ...pad, buttons: [{ value: 1, pressed: 'yes', touched: true }] }] },
    { ...neutral, pads: [{ ...neutralPad, timestamp: 1 }] },
    { ...neutral, pads: [{ ...neutralPad, axes: [0.5] }] },
    { ...neutral, pads: [{ ...neutralPad, buttons: [{ value: 0, pressed: true, touched: false }] }] },
  ];

  it('is self-contained and matches @napplet/nap/gamepad on spec vectors', () => {
    const literal = Function(`return ${GAMEPAD_STATE_TOOLS_SOURCE};`)() as ReturnType<typeof createGamepadStateTools>;
    const reference = createGamepadStateTools();
    for (const value of vectors) expect(literal.isGamepadState(value)).toBe(reference.isGamepadState(value));
    for (const state of [focused, neutral, { available: false, reason: 'blocked', focused: false, pads: [] }] as const) {
      const copy = literal.copyGamepadState(state as never);
      expect(copy).toEqual(reference.copyGamepadState(state as never));
      if (state.pads[1]) expect(copy.pads[1]!.buttons[0]).not.toBe(state.pads[1].buttons[0]);
    }
  });
});
