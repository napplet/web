import { describe, it, expect } from 'vitest';
import type { NappletGlobal } from '@napplet/core';
import { installNappletGlobal } from '../src/index.js';

function napplet(): NappletGlobal {
  return (window as unknown as { napplet: NappletGlobal }).napplet;
}

describe('@napplet/shim — runtime injection', () => {
  it('installs domain objects without a generic shell API', () => {
    const installed = napplet();
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
});
