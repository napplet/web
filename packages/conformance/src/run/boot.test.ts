// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { bootAndCollect, runtimePrelude } from './boot.js';

describe('bootAndCollect — DOM wiring', () => {
  it('does not infer installation from an uninstrumented DOM load and cleans up the iframe', async () => {
    const before = document.querySelectorAll('iframe').length;
    const boot = await bootAndCollect({
      url: 'about:blank',
      readyTimeoutMs: 60,
      settleMs: 0,
      runDegraded: false,
    });
    // happy-dom does not execute srcdoc scripts. A successful load alone is not
    // evidence that the namespace was installed; real Chromium covers that path.
    expect(boot.installedGlobal).toBe(false);
    expect(boot.bootError).toBeNull();
    expect(boot.emitted).toEqual([]);
    expect(boot.degraded).toBeNull();
    expect(document.querySelectorAll('iframe').length).toBe(before);
  });

  it('keeps installation separate from subject errors and ignores peer telemetry', async () => {
    const pending = bootAndCollect({ url: 'about:blank', readyTimeoutMs: 60, settleMs: 10, runDegraded: false });
    await Promise.resolve();
    const frame = document.querySelector('iframe')!;
    expect(frame).not.toBeNull();
    window.dispatchEvent(new MessageEvent('message', { source: frame.contentWindow, data: { type: '__nappletConformance.installed', installed: true } }));
    window.dispatchEvent(new MessageEvent('message', { source: window, data: { type: '__nappletConformance.installed', installed: false } }));
    window.dispatchEvent(new MessageEvent('message', { source: frame.contentWindow, data: { type: '__nappletConformance.error', reason: 'subject failure' } }));
    const boot = await pending;
    expect(boot.installedGlobal).toBe(true);
    expect(boot.bootError).toBe('napplet boot error: subject failure');
    expect(boot.emitted).toEqual([]);
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
      value: { postMessage: (message: Record<string, unknown>) => {
        if (!String(message.type).startsWith('__nappletConformance.')) posted.push(message);
      } },
    });

    try {
      Function(runtimePrelude(['resource']))();
      const napplet = (window as unknown as {
        napplet: {
          resource: {
            bytes(url: string, options?: { signal?: AbortSignal }): Promise<Blob>;
            bytesMany(urls: string[]): Promise<unknown[]>;
          };
        };
      }).napplet;
      const promise = napplet.resource.bytes('data:text/plain;base64,aGk=');

      expect(posted).toEqual([{
        type: 'resource.bytes',
        id: expect.any(String),
        url: 'data:text/plain;base64,aGk=',
      }]);

      window.dispatchEvent(new MessageEvent('message', {
        source: window.parent,
        data: {
          type: 'resource.bytes.result',
          id: posted[0].id,
          blob: 'aGk=',
          mime: 'text/plain',
        },
      }));

      expect(await (await promise).text()).toBe('hi');

      const many = napplet.resource.bytesMany(['blossom:abc.bin']);
      expect(posted[1]).toEqual({
        type: 'resource.bytesMany',
        id: expect.any(String),
        urls: ['blossom:abc.bin'],
      });
      window.dispatchEvent(new MessageEvent('message', {
        source: window.parent,
        data: {
          type: 'resource.bytesMany.result',
          id: posted[1].id,
          items: [{ url: 'blossom:abc.bin', ok: true, blob: 'aGk=', mime: 'text/plain' }],
        },
      }));
      const result = await many as Array<{ blob: Blob }>;
      expect(await result[0].blob.text()).toBe('hi');
    } finally {
      Object.defineProperty(window, 'parent', { configurable: true, value: previousParent });
      delete (window as unknown as { napplet?: unknown }).napplet;
    }
  });
});
