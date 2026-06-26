// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { bootAndCollect } from './boot.js';

describe('bootAndCollect — DOM wiring', () => {
  it('injects the runtime namespace and cleans up the iframe', async () => {
    const before = document.querySelectorAll('iframe').length;
    const boot = await bootAndCollect({
      url: 'about:blank',
      readyTimeoutMs: 60,
      settleMs: 0,
      runDegraded: false,
    });
    expect(boot.installedGlobal).toBe(true);
    expect(boot.bootError).toBeNull();
    expect(boot.emitted).toEqual([]);
    expect(boot.degraded).toBeNull();
    expect(document.querySelectorAll('iframe').length).toBe(before);
  });

  it('runs a degraded pass when requested', async () => {
    const boot = await bootAndCollect({
      url: 'about:blank',
      readyTimeoutMs: 40,
      settleMs: 0,
      runDegraded: true,
    });
    expect(boot.degraded).not.toBeNull();
    expect(boot.degraded!.bootError).toBeNull();
  });
});
