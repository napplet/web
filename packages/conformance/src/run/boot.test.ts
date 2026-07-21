// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { bootAndCollect, runtimePrelude } from './boot.js';

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

  it('resource prelude methods emit envelopes and resolve shell results', async () => {
    const posted: Array<Record<string, unknown>> = [];
    const previousParent = window.parent;
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: { postMessage: (message: Record<string, unknown>) => posted.push(message) },
    });

    try {
      Function(runtimePrelude(['resource']))();
      const napplet = (window as unknown as {
        napplet: { resource: { bytes(url: string): Promise<Blob> } };
      }).napplet;
      const promise = napplet.resource.bytes('data:text/plain;base64,aGk=');

      expect(posted).toEqual([{
        type: 'resource.bytes',
        id: expect.any(String),
        url: 'data:text/plain;base64,aGk=',
      }]);

      window.dispatchEvent(new MessageEvent('message', {
        data: {
          type: 'resource.bytes.result',
          id: posted[0].id,
          blob: new Blob(['hi'], { type: 'text/plain' }),
          mime: 'text/plain',
        },
      }));

      expect(await (await promise).text()).toBe('hi');
    } finally {
      Object.defineProperty(window, 'parent', { configurable: true, value: previousParent });
      delete (window as unknown as { napplet?: unknown }).napplet;
    }
  });
});
