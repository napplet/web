import { describe, expect, it, vi } from 'vitest';
import { catalog, catalogGet } from '@napplet/sdk';
import { get } from '@napplet/sdk/catalog';
import { installNappletRuntimePrelude, renderNappletRuntimePreludeCall } from './prelude.js';

function deliver(data: unknown, source: MessageEventSource | null = window.parent): void {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
}

describe('runtime-injected CATALOG', () => {
  it('serves SDK calls without shell or intent and rejects forged result sources', async () => {
    const snapshot = { napplets: [], handlers: [] };
    let requestId = '';
    const post = vi.spyOn(window.parent, 'postMessage').mockImplementation((message) => { requestId = message.id; });
    try {
      const installed = installNappletRuntimePrelude({ domains: ['catalog'] });
      expect(Object.keys(installed)).toEqual(['catalog']);
      expect(post).not.toHaveBeenCalled();
      expect(renderNappletRuntimePreludeCall({ domains: ['catalog'] })).toContain('"domains":["catalog"]');
      const request = catalog.get();
      let settled = false;
      void request.then(() => { settled = true; });
      expect(post).toHaveBeenCalledExactlyOnceWith({ type: 'catalog.get', id: requestId }, '*');
      deliver({ type: 'catalog.get.result', id: requestId, snapshot }, {} as MessageEventSource);
      await Promise.resolve();
      expect(settled).toBe(false);
      deliver({ type: 'catalog.get.result', id: requestId, snapshot });
      await expect(request).resolves.toEqual(snapshot);
      post.mockImplementation((message) => deliver({ type: 'catalog.get.result', id: message.id, snapshot }));
      await expect(get()).resolves.toEqual(snapshot);
      await expect(catalogGet()).resolves.toEqual(snapshot);
      installNappletRuntimePrelude({ domains: [] });
      expect(() => catalog.get()).toThrow('catalog');
      expect(() => get()).toThrow('catalog');
    } finally { post.mockRestore(); }
  });
});
