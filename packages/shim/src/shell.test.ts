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

  it('installs INTENT delivery without requiring INC or SHELL', () => {
    const installed = installNappletGlobal({ domains: ['intent'] });

    expect(installed.inc).toBeUndefined();
    expect(installed.intent).toMatchObject({
      invoke: expect.any(Function),
      open: expect.any(Function),
      available: expect.any(Function),
      handlers: expect.any(Function),
      onChanged: expect.any(Function),
    });
    expect(installed.intent?.onDelivery).toEqual(expect.any(Function));
  });

  it('installs the complete INC topic and channel surface', () => {
    const installed = installNappletGlobal({ domains: ['inc'] });

    expect(installed.inc).toMatchObject({
      emit: expect.any(Function),
      on: expect.any(Function),
      channel: {
        open: expect.any(Function),
        onOpened: expect.any(Function),
        list: expect.any(Function),
        broadcast: expect.any(Function),
      },
    });
  });
});
