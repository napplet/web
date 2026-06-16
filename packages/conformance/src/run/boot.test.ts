// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { bootAndCollect } from './boot.js';

// These exercise the real DOM wiring (iframe creation under sandbox, the message
// listener, cleanup) and the boot-timeout branch deterministically. The happy
// path (a real napplet posting shell.ready) is covered by the Playwright e2e in
// @napplet/conformance-cli against real fixtures.
describe('bootAndCollect — DOM wiring + timeout branch', () => {
  it('reports a boot failure when no shell.ready arrives within the timeout', async () => {
    const before = document.querySelectorAll('iframe').length;
    const boot = await bootAndCollect({
      url: 'about:blank',
      readyTimeoutMs: 60,
      settleMs: 0,
      runDegraded: false,
    });
    expect(boot.installedGlobal).toBe(false);
    expect(boot.bootError).toMatch(/did not boot/);
    expect(boot.emitted).toEqual([]);
    expect(boot.degraded).toBeNull();
    // The harness cleans up its iframe.
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
    expect(boot.degraded!.bootError).toMatch(/did not boot/);
  });
});
