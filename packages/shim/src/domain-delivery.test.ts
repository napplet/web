import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installNappletGlobal } from './runtime.js';
import { installFakeShell, type FakeShell } from '../../nap/src/test-support/fake-shell.js';

let shell: FakeShell;

/** Deliver a shell -> napplet envelope over the NIP-5D port. */
function deliver(data: unknown): void {
  shell.deliver(data);
}

/** A window-level message, even one whose source is the parent: NIP-5D shells speak NAP only over the port. */
function deliverAtWindowLevel(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data, source: window.parent }));
}

beforeEach(() => {
  shell = installFakeShell();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('domain exposure and lifecycle-independent delivery', () => {
  it('buffers intent delivery without shell readiness and ignores unavailable domains', () => {
    const installed = installNappletGlobal({ domains: ['intent', 'theme', 'identity'] });
    const themeChanged = vi.fn();
    const identityChanged = vi.fn();
    installed.theme!.onChanged(themeChanged);
    installed.identity!.onChanged(identityChanged);
    const delivery = { id: 'delivery-1', sender: 'catalog-source', archetype: 'note', action: 'open', convention: 'napplet:note/open', payload: { event: 'abc' } };
    deliver({ type: 'intent.deliver', delivery });
    const received = vi.fn();
    installed.intent!.onDelivery(received);
    expect(received).toHaveBeenCalledExactlyOnceWith(delivery);
    expect(installed.shell).toBeUndefined();
    const theme = { colors: { background: '#000000', text: '#ffffff', primary: '#663399' } };
    deliver({ type: 'theme.changed', theme });
    deliver({ type: 'identity.changed', pubkey: '' });
    expect(themeChanged).toHaveBeenCalledExactlyOnceWith(theme);
    expect(identityChanged).toHaveBeenCalledExactlyOnceWith('');
    expect(received).toHaveBeenCalledTimes(1);
    installNappletGlobal({ domains: ['intent'] });
    deliver({ type: 'theme.changed', theme });
    deliver({ type: 'identity.changed', pubkey: 'f'.repeat(64) });
    expect(themeChanged).toHaveBeenCalledTimes(1);
    expect(identityChanged).toHaveBeenCalledTimes(1);
    deliverAtWindowLevel({ type: 'intent.deliver', delivery });
    expect(received).toHaveBeenCalledTimes(1);
    deliver({ type: 'intent.deliver', delivery });
    expect(received).toHaveBeenCalledTimes(2);
  });

  it('installs the receiver before automatic readiness and exposes synchronous presence', async () => {
    shell.onSend((message) => {
      if (message.type === 'shell.ready') deliver({ type: 'shell.init', capabilities: { domains: ['shell', 'identity'] }, services: ['settings'] });
    });
    const installed = installNappletGlobal({ domains: ['shell', 'identity'] });
    expect(installed.shell!.supports('identity')).toBe(true);
    expect(installed.shell!.supports('theme')).toBe(false);
    await expect(installed.shell!.ready()).resolves.toEqual({ capabilities: { domains: ['shell', 'identity'] }, services: ['settings'] });
    expect(installed.shell!.services).toEqual(['settings']);
    expect(shell.sent).toEqual([{ type: 'shell.ready' }]);
    expect(shell.windowMessages).toEqual([]);
  });

  // NAP-MEDIA (napplet/naps#10 @ 7806f438): window.napplet.media.onEnded over the port.
  it('routes media.session.ended from the port to window.napplet.media.onEnded', () => {
    const installed = installNappletGlobal({ domains: ['media'] });
    const ended = vi.fn();
    const state = vi.fn();
    installed.media!.onEnded('shell-7', ended);
    installed.media!.onState('shell-7', state);
    deliver({ type: 'media.session.ended', sessionId: 'shell-7', reason: 'preempted' });
    deliver({ type: 'media.state', sessionId: 'shell-7', status: 'playing' });
    expect(ended).toHaveBeenCalledExactlyOnceWith({ sessionId: 'shell-7', reason: 'preempted' });
    expect(state).not.toHaveBeenCalled();
  });
});

