import { describe, expect, it, vi } from 'vitest';
import { installNappletGlobal } from './runtime.js';

function deliver(data: unknown, source: MessageEventSource | null = window.parent): void {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
}

describe('domain exposure and lifecycle-independent delivery', () => {
  it('buffers intent delivery without shell readiness and ignores unavailable domains', () => {
    const installed = installNappletGlobal({ domains: ['intent', 'theme', 'identity'] });
    const themeChanged = vi.fn();
    const identityChanged = vi.fn();
    installed.theme!.onChanged(themeChanged);
    installed.identity!.onChanged(identityChanged);
    const delivery = { sender: 'catalog-source', archetype: 'note', action: 'open', convention: 'napplet:note/open', payload: { event: 'abc' } };
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
    deliver({ type: 'intent.deliver', delivery }, {} as MessageEventSource);
    expect(received).toHaveBeenCalledTimes(1);
  });

  it('installs the receiver before automatic readiness and exposes synchronous presence', async () => {
    const parentPost = vi.spyOn(window.parent, 'postMessage').mockImplementation((message) => {
      if (message.type === 'shell.ready') deliver({ type: 'shell.init', capabilities: { domains: ['shell', 'identity'] }, services: ['settings'] });
    });
    const installed = installNappletGlobal({ domains: ['shell', 'identity'] });
    expect(installed.shell!.supports('identity')).toBe(true);
    expect(installed.shell!.supports('theme')).toBe(false);
    await expect(installed.shell!.ready()).resolves.toEqual({ capabilities: { domains: ['shell', 'identity'] }, services: ['settings'] });
    expect(installed.shell!.services).toEqual(['settings']);
    expect(parentPost).toHaveBeenCalledExactlyOnceWith({ type: 'shell.ready' }, '*');
    parentPost.mockRestore();
  });
});
