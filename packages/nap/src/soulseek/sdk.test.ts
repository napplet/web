import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as sdk from './sdk.js';

beforeEach(() => { vi.stubGlobal('window', {}); });
afterEach(() => { vi.unstubAllGlobals(); });

const arity: Record<string, number> = {
  info: 0, search: 1, browse: 1, results: 3, stop: 1, download: 1, transfers: 0,
  status: 1, pause: 1, resume: 1, cancel: 1, read: 3, save: 1, release: 2,
};

describe('soulseek SDK', () => {
  it.each(Object.keys(arity))('%s delegates at call time and preserves the runtime promise', (method) => {
    const helper = sdk[`soulseek${method[0].toUpperCase()}${method.slice(1)}` as keyof typeof sdk] as (...args: unknown[]) => unknown;
    expect(() => helper()).toThrow('window.napplet.soulseek is unavailable');
    const result = Promise.resolve({ marker: method });
    const call = vi.fn(() => result);
    vi.stubGlobal('window', { napplet: { soulseek: { [method]: call } } });
    const args = [{ first: true }, 0, 10];
    expect(helper(...args)).toBe(result);
    expect(call).toHaveBeenCalledOnce();
    expect(call.mock.calls[0]).toEqual(args.slice(0, arity[method]));
  });

  it('forwards an explicit undefined page offset so the runtime applies its defaults', () => {
    const call = vi.fn(() => Promise.resolve());
    vi.stubGlobal('window', { napplet: { soulseek: { results: call } } });
    void sdk.soulseekResults('s1', undefined, 10);
    expect(call.mock.calls[0]).toEqual(['s1', undefined, 10]);
  });

  it('recognizes Failure-shaped rejections across bundles without widening the code set', () => {
    expect(sdk.isSoulseekFailure(Object.assign(new Error('Handle is unavailable'), { code: 'not_found' }))).toBe(true);
    expect(sdk.isSoulseekFailure({ code: 'denied', message: 'Policy refused' })).toBe(true);
    expect(sdk.isSoulseekFailure(Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }))).toBe(false);
    expect(sdk.isSoulseekFailure(new Error('soulseek.info timed out'))).toBe(false);
    expect(sdk.isSoulseekFailure({ code: 'denied' })).toBe(false);
    expect(sdk.isSoulseekFailure(null)).toBe(false);
    expect(sdk.isSoulseekFailure('denied')).toBe(false);
  });
});
