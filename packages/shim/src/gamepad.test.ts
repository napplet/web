import { describe, expect, it, vi } from 'vitest';
import { installNappletRuntimePrelude } from './prelude.js';
import { gamepad as sdkGamepad } from '@napplet/sdk/gamepad';

function deliver(data: unknown, source: MessageEventSource | null = window.parent): void {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
}

describe('runtime-injected GAMEPAD', () => {
  it('installs a callable optional API, accepts only parent state and backs the SDK getters', () => {
    const state = { type: 'gamepad.state', available: true, focused: true, pads: [] };
    const post = vi.spyOn(window.parent, 'postMessage').mockImplementation((message) => {
      if (message.type === 'gamepad.subscribe') deliver(state);
    });
    try {
      const installed = installNappletRuntimePrelude({ domains: ['gamepad'] });
      expect(Object.keys(installed)).toEqual(['gamepad']);
      expect(installed.gamepad!.getGamepads()).toEqual([]);
      expect(installed.gamepad!.focused).toBe(true);
      expect(sdkGamepad.focused).toBe(true);
      expect(post.mock.calls).toEqual([[{ type: 'gamepad.subscribe' }, '*']]);
      const changed = vi.fn();
      const sub = sdkGamepad.onChange(changed);
      const neutral = { ...state, focused: false };
      deliver(neutral, {} as MessageEventSource);
      expect(sdkGamepad.focused).toBe(true);
      expect(changed).not.toHaveBeenCalled();
      deliver(neutral);
      expect(sdkGamepad.focused).toBe(false);
      expect(changed).toHaveBeenCalledExactlyOnceWith({ available: true, focused: false, pads: [] });
      sub.close();
      installNappletRuntimePrelude({ domains: [] });
      expect(() => sdkGamepad.getGamepads()).toThrow('gamepad');
      deliver(state);
      expect(changed).toHaveBeenCalledTimes(1);
    } finally { post.mockRestore(); }
  });
});
