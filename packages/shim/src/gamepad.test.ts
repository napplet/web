import { afterEach, describe, expect, it, vi } from 'vitest';
import { installNappletRuntimePrelude } from './prelude.js';
import { gamepad as sdkGamepad } from '@napplet/sdk/gamepad';
import { installFakeShell } from '../../nap/src/test-support/fake-shell.js';

/** A window-level message, even one whose source is the parent: NIP-5D shells speak NAP only over the port. */
function deliverAtWindowLevel(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data, source: window.parent }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('runtime-injected GAMEPAD', () => {
  it('installs a callable optional API, accepts only port state and backs the SDK getters', () => {
    const state = { type: 'gamepad.state', available: true, focused: true, pads: [] };
    const shell = installFakeShell();
    shell.onSend((message) => {
      if (message.type === 'gamepad.subscribe') shell.deliver(state);
    });
    const installed = installNappletRuntimePrelude({ domains: ['gamepad'] });
    expect(Object.keys(installed)).toEqual(['gamepad']);
    expect(shell.sent).toEqual([]);
    expect(installed.gamepad!.getGamepads()).toEqual([]);
    expect(installed.gamepad!.focused).toBe(true);
    expect(sdkGamepad.focused).toBe(true);
    expect(shell.sent).toEqual([{ type: 'gamepad.subscribe' }]);
    expect(shell.windowMessages).toEqual([]);
    const changed = vi.fn();
    const sub = sdkGamepad.onChange(changed);
    const neutral = { ...state, focused: false };
    deliverAtWindowLevel(neutral);
    expect(sdkGamepad.focused).toBe(true);
    expect(changed).not.toHaveBeenCalled();
    shell.deliver(neutral);
    expect(sdkGamepad.focused).toBe(false);
    expect(changed).toHaveBeenCalledExactlyOnceWith({ available: true, focused: false, pads: [] });
    sub.close();
    installNappletRuntimePrelude({ domains: [] });
    expect(() => sdkGamepad.getGamepads()).toThrow('gamepad');
    shell.deliver(state);
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
