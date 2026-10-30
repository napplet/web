import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as sdk from './sdk.js';

beforeEach(() => { vi.stubGlobal('window', {}); });
afterEach(() => { vi.unstubAllGlobals(); });

const methods = ['capabilities', 'fromEvent', 'toMagnet', 'search', 'publish', 'comment', 'pickFiles',
  'add', 'status', 'jobs', 'files', 'selectFiles', 'pause', 'resume', 'remove', 'onState', 'onProgress', 'onError'];

describe('torrent SDK', () => {
  it.each(methods)('%s delegates at call time and preserves runtime result', (method) => {
    const helper = sdk[`torrent${method[0].toUpperCase()}${method.slice(1)}` as keyof typeof sdk] as (...args: unknown[]) => unknown;
    expect(() => helper()).toThrow('window.napplet.torrent is unavailable');
    const result = method.startsWith('on') ? { close: vi.fn() } : Promise.resolve({ ok: false, error: 'user-denied' });
    const call = vi.fn(() => result);
    vi.stubGlobal('window', { napplet: { torrent: { [method]: call } } });
    const first = { input: true }; const second = { deleteData: false };
    const returned = helper(first, second);
    expect(returned).toBe(result);
    expect(call).toHaveBeenCalledOnce();
    // Helpers pass only their named parameters, preserving explicit false values.
    const expectedCount = method === 'capabilities' ? 0 : ['selectFiles', 'remove'].includes(method) ? 2 : 1;
    expect(call.mock.calls[0]).toEqual([first, second].slice(0, expectedCount));
  });
});
