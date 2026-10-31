import { describe, expect, it, vi } from 'vitest';
import { installNappletRuntimePrelude } from './prelude.js';
import { soulseek, isSoulseekFailure } from '@napplet/sdk/soulseek';

function deliver(data: unknown, source: MessageEventSource | null = window.parent): void {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
}

const file = { fileId: 'f1', username: 'field-recorder', path: 'Recordings\\rain.txt', size: '3', locked: false };

describe('runtime-injected SOULSEEK', () => {
  it('exposes only granted domains and routes trusted results through the SDK', async () => {
    const post = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    try {
      const installed = installNappletRuntimePrelude({ domains: ['soulseek'] });
      expect(Object.keys(installed)).toEqual(['soulseek']);
      expect(post).not.toHaveBeenCalled();
      expect(Object.keys(installed.soulseek!).sort()).toEqual([
        'browse', 'cancel', 'download', 'info', 'pause', 'read', 'release', 'results',
        'resume', 'save', 'search', 'status', 'stop', 'transfers',
      ]);
      const searched = soulseek.search({ text: 'field recording' });
      const request = post.mock.calls[0][0];
      expect(request).toEqual({ type: 'soulseek.search', id: expect.any(String), request: { text: 'field recording' } });
      expect(post.mock.calls[0][1]).toBe('*');
      const value = { queryId: 's1', kind: 'search', state: 'collecting', count: 0, maxResults: 500, maxPageSize: 100, timeoutMs: 30000 };
      deliver({ type: 'soulseek.search.result', id: request.id, value: { ...value, queryId: 'forged' } }, {} as MessageEventSource);
      deliver({ type: 'soulseek.search.result', id: request.id, value });
      await expect(searched).resolves.toEqual(value);

      const downloaded = soulseek.download(file.fileId);
      const downloadRequest = post.mock.calls[1][0];
      expect(downloadRequest).toEqual({ type: 'soulseek.download', id: expect.any(String), fileId: 'f1' });
      deliver({ type: 'soulseek.download.result', id: downloadRequest.id, error: { code: 'not_found', message: 'File handle is unavailable' } });
      const failure = await downloaded.catch((error: unknown) => error);
      expect(isSoulseekFailure(failure)).toBe(true);
      expect((failure as { code: string }).code).toBe('not_found');

      installNappletRuntimePrelude({ domains: [] });
      expect(() => soulseek.transfers()).toThrow('soulseek');
    } finally { post.mockRestore(); }
  });
});
