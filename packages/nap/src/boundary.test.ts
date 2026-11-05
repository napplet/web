import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeShell } from './test-support/fake-shell.js';
import { connectShell, onShellMessage, postToShell } from './boundary.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

// NIP-5D Transport: one window-level napplet.hello carrying exactly one port, then NAP over the port.
// https://github.com/nostr-protocol/nips/pull/2303
describe('NIP-5D port transport', () => {
  it('hands one port to the shell in a single napplet.hello', () => {
    const shell = installFakeShell();
    connectShell();
    connectShell();
    postToShell({ type: 'storage.get', id: '1', key: 'k' });
    expect(shell.hellos).toBe(1);
    expect(shell.windowMessages).toEqual([]);
  });

  it('sends NAP envelopes over the port, never at window level', () => {
    const shell = installFakeShell();
    postToShell({ type: 'identity.getPublicKey', id: 'i1' });
    expect(shell.sent).toEqual([{ type: 'identity.getPublicKey', id: 'i1' }]);
    expect(shell.windowMessages).toEqual([]);
  });

  it('delivers only port messages to listeners', () => {
    const shell = installFakeShell();
    const received: unknown[] = [];
    const off = onShellMessage((message) => received.push(message));
    shell.deliver({ type: 'theme.changed', theme: {} });
    shell.deliver('not an envelope');
    shell.deliver({ noType: true });
    off();
    shell.deliver({ type: 'theme.changed', theme: { late: true } });
    expect(received).toEqual([{ type: 'theme.changed', theme: {} }]);
  });
});
