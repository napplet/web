import { afterEach, describe, expect, it, vi } from 'vitest';
import { installNappletGlobal } from './runtime.js';
import { installNappletRuntimePrelude } from './prelude.js';
import { installFakeShell } from '../../nap/src/test-support/fake-shell.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// NIP-5D Transport: the bootstrap transfers one port to the shell exactly once, in napplet.hello.
// https://github.com/nostr-protocol/nips/pull/2303
describe('NIP-5D napplet.hello handoff', () => {
  it('sends exactly one napplet.hello carrying one port, even across repeated installs', () => {
    const shell = installFakeShell();
    const parentPost = vi.mocked(window.parent.postMessage);

    installNappletGlobal({ domains: ['storage'] });
    installNappletGlobal({ domains: ['storage', 'theme'] });
    const installed = installNappletRuntimePrelude({ domains: ['storage'] });

    expect(parentPost).toHaveBeenCalledTimes(1);
    const [message, , transfer] = parentPost.mock.calls[0] as unknown as [unknown, unknown, unknown[]];
    expect(message).toEqual({ type: 'napplet.hello' });
    expect(transfer).toHaveLength(1);
    expect(shell.hellos).toBe(1);
    expect(shell.windowMessages).toEqual([]);

    // NAP traffic after the repeated installs still uses that single port.
    void installed.storage!.getItem('k');
    expect(shell.sent).toEqual([{ type: 'storage.get', id: expect.any(String), key: 'k' }]);
    expect(parentPost).toHaveBeenCalledTimes(1);
  });
});
