import { afterEach, describe, expect, it, vi } from 'vitest';
import { installNappletRuntimePrelude } from './prelude.js';
import * as sdk from '@napplet/sdk';

function deliver(data: unknown, source: MessageEventSource | null = window.parent): void {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
}

afterEach(() => { installNappletRuntimePrelude({ domains: [] }); vi.restoreAllMocks(); });

describe('runtime-injected MOTION', () => {
  it('connects the SDK to only the parent and clears state when removed and reinstalled', async () => {
    const post = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
    const installed = installNappletRuntimePrelude({ domains: ['motion'] });
    expect(Object.keys(installed)).toEqual(['motion']);
    expect(post).not.toHaveBeenCalled();
    expect(sdk.motion.state()).toEqual({ available: true, permission: 'prompt', absolute: false, focused: false, frequency: 0 });
    const focused = { type: 'motion.state', available: true, permission: 'granted', absolute: false, focused: true, frequency: 60 };
    deliver(focused, {} as MessageEventSource);
    expect(sdk.motion.state().focused).toBe(false);
    deliver(focused);
    expect(sdk.motion.state().focused).toBe(true);
    const permission = sdk.motion.requestPermission(true);
    const request = post.mock.calls.at(-1)![0];
    expect(request).toMatchObject({ type: 'motion.permission', absolute: true });
    deliver({ type: 'motion.permission.result', id: request.id, permission: 'granted', absolute: false });
    await expect(permission).resolves.toEqual({ permission: 'granted', absolute: false });
    installNappletRuntimePrelude({ domains: [] });
    expect(post).toHaveBeenLastCalledWith({ type: 'motion.unsubscribe' }, '*');
    expect(() => sdk.motion.state()).toThrow('motion');
    installNappletRuntimePrelude({ domains: ['motion'] });
    expect(sdk.motion.state().focused).toBe(false);
    expect(sdk.motion.latest()).toBeNull();
  });
});
