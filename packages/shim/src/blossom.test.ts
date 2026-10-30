import { describe, expect, it, vi } from 'vitest';
import { installNappletRuntimePrelude } from './prelude.js';
import { blossom } from '@napplet/sdk/blossom';

function deliver(data: unknown, source: MessageEventSource | null = window.parent): void {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
}

describe('runtime-injected BLOSSOM', () => {
  it('exposes only granted operations, preserves binary payloads, and accepts only parent results', async () => {
    const post = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    try {
      const installed = installNappletRuntimePrelude({ domains: ['blossom'] });
      expect(Object.keys(installed)).toEqual(['blossom']);
      expect(post).not.toHaveBeenCalled();
      const data = new Blob(['exact bytes']);
      const request = { server: 'https://cdn.example.com', data };
      const upload = blossom.upload(request);
      const message = post.mock.calls[0][0];
      expect(message).toEqual({ type: 'blossom.upload', id: expect.any(String), request });
      expect(message.request.data).toBe(data);
      let resolved = false;
      void upload.then(() => { resolved = true; });
      const result = { ok: false, status: 0, error: 'blocked-by-policy' };
      deliver({ type: 'blossom.upload.result', id: message.id, result }, {} as MessageEventSource);
      await Promise.resolve();
      expect(resolved).toBe(false);
      deliver({ type: 'blossom.upload.result', id: message.id, result });
      await expect(upload).resolves.toEqual(result);

      const get = blossom.get({ server: request.server, sha256: 'a'.repeat(64) });
      const getMessage = post.mock.calls[1][0];
      const blob = new ArrayBuffer(3);
      deliver({ type: 'blossom.get.result', id: getMessage.id, result: { ok: true, status: 200, blob } });
      expect((await get).blob).toBe(blob);
      installNappletRuntimePrelude({ domains: [] });
      expect(() => blossom.servers()).toThrow('blossom');
    } finally { post.mockRestore(); }
  });
});
