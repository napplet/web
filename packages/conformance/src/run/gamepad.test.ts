// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import type { GamepadApi } from '@napplet/core';
import { runtimePrelude } from './boot.js';

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
});
