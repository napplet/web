import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { releaseImages, verifiedImage } from './media';

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const sha256 = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource))].map(byte => byte.toString(16).padStart(2, '0')).join('');

describe('verified media fetches', () => {
  let hash: string;
  beforeEach(async () => {
    hash = await sha256(png);
    vi.stubGlobal('createImageBitmap', async () => ({ width: 2, height: 1, close: () => {} }));
  });
  afterEach(() => {
    releaseImages();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('times out a stalled mirror and tries the next one without AbortSignal.any', async () => {
    vi.useFakeTimers();
    const any = AbortSignal.any;
    Reflect.set(AbortSignal, 'any', undefined);
    onTestFinished(() => { Reflect.set(AbortSignal, 'any', any); });
    const fetch = vi.fn((url: URL, init: RequestInit) => url.hostname === 'stall.example'
      ? new Promise<Response>((_, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))))
      : Promise.resolve(new Response(png)));
    vi.stubGlobal('fetch', fetch);
    const pending = verifiedImage({ sha256: hash, type: 'image/png' }, ['https://stall.example', 'https://good.example'], new AbortController().signal);
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(pending).resolves.toMatch(/^blob:/);
    expect(fetch.mock.calls.map(([url]) => url.hostname)).toEqual(['stall.example', 'good.example']);
  });

  it('does not let one mirror list answer for another sharing a hash', async () => {
    vi.stubGlobal('fetch', async (url: URL) => url.hostname === 'bad.example' ? new Response(null, { status: 404 }) : new Response(png));
    const signal = new AbortController().signal;
    const [failed, working] = await Promise.all([
      verifiedImage({ sha256: hash, type: 'image/png' }, ['https://bad.example'], signal),
      verifiedImage({ sha256: hash, type: 'image/png' }, ['https://good.example'], signal),
    ]);
    expect(failed).toBeNull();
    expect(working).toMatch(/^blob:/);
  });
});
