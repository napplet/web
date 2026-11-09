import { afterEach, describe, expect, it, vi } from 'vitest';
import { installNappletRuntimePrelude } from './prelude.js';
import { soulseek, isSoulseekFailure } from '@napplet/sdk/soulseek';
import { installFakeShell } from '../../nap/src/test-support/fake-shell.js';

/** A window-level message, even one whose source is the parent: NIP-5D shells speak NAP only over the port. */
function deliverAtWindowLevel(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data, source: window.parent }));
}

const file = { fileId: 'f1', username: 'field-recorder', path: 'Recordings\\rain.txt', size: '3', locked: false };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('runtime-injected SOULSEEK', () => {
  it('exposes only granted domains and routes results only over the port', async () => {
    const shell = installFakeShell();
    const installed = installNappletRuntimePrelude({ domains: ['soulseek'] });
    expect(Object.keys(installed)).toEqual(['soulseek']);
    expect(shell.sent).toEqual([]);
    expect(Object.keys(installed.soulseek!).sort()).toEqual([
      'browse', 'cancel', 'download', 'info', 'pause', 'read', 'release', 'results',
      'resume', 'save', 'search', 'status', 'stop', 'transfers',
    ]);
    const searched = soulseek.search({ text: 'field recording' });
    const request = shell.sent[0] as { id: string };
    expect(request).toEqual({ type: 'soulseek.search', id: expect.any(String), request: { text: 'field recording' } });
    const value = { queryId: 's1', kind: 'search', state: 'collecting', count: 0, maxResults: 500, maxPageSize: 100, timeoutMs: 30000 };
    let settled = false;
    void searched.then(() => { settled = true; });
    deliverAtWindowLevel({ type: 'soulseek.search.result', id: request.id, value: { ...value, queryId: 'forged' } });
    await Promise.resolve();
    expect(settled).toBe(false);
    shell.deliver({ type: 'soulseek.search.result', id: request.id, value });
    await expect(searched).resolves.toEqual(value);

    const downloaded = soulseek.download(file.fileId);
    const downloadRequest = shell.sent[1] as { id: string };
    expect(downloadRequest).toEqual({ type: 'soulseek.download', id: expect.any(String), fileId: 'f1' });
    shell.deliver({ type: 'soulseek.download.result', id: downloadRequest.id, error: { code: 'not_found', message: 'File handle is unavailable' } });
    const failure = await downloaded.catch((error: unknown) => error);
    expect(isSoulseekFailure(failure)).toBe(true);
    expect((failure as { code: string }).code).toBe('not_found');
    expect(shell.windowMessages).toEqual([]);

    installNappletRuntimePrelude({ domains: [] });
    expect(() => soulseek.transfers()).toThrow('soulseek');
  });
});
