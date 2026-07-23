import { describe, it, expect } from 'vitest';
import { installNappletGlobal } from '../src/runtime.js';

describe('@napplet/shim — runtime injection', () => {
  it('installs selected domain objects without a generic shell API', () => {
    const installed = installNappletGlobal({ domains: ['relay', 'storage', 'cvm'] });
    expect(installed.relay).toBeDefined();
    expect(installed.storage).toBeDefined();
    expect(installed.cvm?.registry).toBeDefined();
    expect((installed as { shell?: unknown }).shell).toBeUndefined();
  });

  it('can install only selected domains', () => {
    const installed = installNappletGlobal({ domains: ['relay'] });

    expect(installed.relay).toBeDefined();
    expect(installed.storage).toBeUndefined();
    expect(installed.identity).toBeUndefined();
    expect((installed as { shell?: unknown }).shell).toBeUndefined();
  });

  it('delivers intent pushes through the authenticated parent path without INC', () => {
    const installed = installNappletGlobal({ domains: ['intent'] });
    const received: unknown[] = [];

    expect(installed.inc).toBeUndefined();
    expect(installed.intent).toMatchObject({
      invoke: expect.any(Function),
      open: expect.any(Function),
      available: expect.any(Function),
      handlers: expect.any(Function),
      onChanged: expect.any(Function),
      onDelivery: expect.any(Function),
    });

    const subscription = installed.intent!.onDelivery((delivery) => received.push(delivery));

    window.dispatchEvent(new MessageEvent('message', {
      source: window.parent,
      data: {
        type: 'intent.deliver',
        delivery: {
          sender: 'runtime-attested-source',
          archetype: 'profile',
          action: 'open',
          convention: 'napplet:profile/open',
          payload: { pubkey: 'abc123' },
        },
      },
    }));

    expect(received).toEqual([{
      sender: 'runtime-attested-source',
      archetype: 'profile',
      action: 'open',
      convention: 'napplet:profile/open',
      payload: { pubkey: 'abc123' },
    }]);

    subscription.close();
  });
});
