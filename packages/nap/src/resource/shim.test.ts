import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResourceBytes, ResourceBytesItem, ResourceInfo } from './types.js';

const posted: Array<Record<string, unknown>> = [];
let uuidCounter = 0;
let originalCryptoDescriptor: PropertyDescriptor | undefined;
let originalFetchDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  posted.length = 0;
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  originalFetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `resource-test-${++uuidCounter}`,
    },
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      parent: {
        postMessage(msg: Record<string, unknown>) {
          posted.push(msg);
        },
      },
    },
  });

  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'crypto');
  }
  if (originalFetchDescriptor) {
    Object.defineProperty(globalThis, 'fetch', originalFetchDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'fetch');
  }
  Reflect.deleteProperty(globalThis, 'window');
});

function lastPosted(type: string): Record<string, unknown> {
  for (let i = posted.length - 1; i >= 0; i--) {
    if (posted[i].type === type) return posted[i];
  }
  throw new Error(`no posted message of type ${type}`);
}

describe('@napplet/nap/resource shim', () => {
  it('posts resource.info and resolves with advisory runtime info', async () => {
    const { info, handleResourceMessage } = await import('./shim.js');

    const promise = info();
    const sent = lastPosted('resource.info');
    expect(sent).toEqual({
      type: 'resource.info',
      id: 'resource-test-1',
    });

    const runtimeInfo: ResourceInfo = {
      schemes: [
        { scheme: 'https', enabled: true },
        { scheme: 'blossom', enabled: false },
      ],
      maxBytes: 10_485_760,
      maxUrls: 100,
    };
    handleResourceMessage({ type: 'resource.info.result', id: sent.id, info: runtimeInfo });

    await expect(promise).resolves.toEqual(runtimeInfo);
  });

  it('rejects resource.info errors', async () => {
    const { info, handleResourceMessage } = await import('./shim.js');

    const promise = info();
    const sent = lastPosted('resource.info');
    handleResourceMessage({
      type: 'resource.info.error',
      id: sent.id,
      error: 'policy-denied',
      message: 'redacted',
    });

    await expect(promise).rejects.toThrow('policy-denied: redacted');
  });

  it('routes data URLs through shell policy and decodes canonical wire bytes', async () => {
    const { bytes, handleResourceMessage } = await import('./shim.js');
    const promise = bytes('data:application/octet-stream;base64,AAEC/w==');
    const sent = lastPosted('resource.bytes');
    expect(sent).toEqual({ type: 'resource.bytes', id: 'resource-test-1', url: 'data:application/octet-stream;base64,AAEC/w==' });
    handleResourceMessage({ type: 'resource.bytes.result', id: sent.id, blob: 'AAEC/w==', mime: 'application/octet-stream' });
    const blob = await promise;
    expect(blob.type).toBe('application/octet-stream');
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([0, 1, 2, 255]);
  });

  it('preserves BUD-10 URL hints without separate server fields', async () => {
    const { bytes, handleResourceMessage } = await import('./shim.js');
    const url = `blossom:${'a'.repeat(64)}.bin?xs=cdn.example&xs=mirror.example`;
    const promise = bytes(url);
    const sent = lastPosted('resource.bytes');
    expect(sent).toEqual({ type: 'resource.bytes', id: 'resource-test-1', url });
    handleResourceMessage({ type: 'resource.bytes.result', id: sent.id, blob: '', mime: 'application/octet-stream' });
    expect((await promise).size).toBe(0);
  });

  it('posts bulk URLs and decodes successes while retaining item errors', async () => {
    const { bytesMany, handleResourceMessage } = await import('./shim.js');

    const urls = [`blossom:${'a'.repeat(64)}.bin?xs=cdn.example`, 'https://example.com/missing.png'];
    const promise = bytesMany(urls);
    const sent = lastPosted('resource.bytesMany');
    expect(sent).toEqual({
      type: 'resource.bytesMany',
      id: 'resource-test-1',
      urls,
    });

    const items: ResourceBytesItem<ResourceBytes>[] = [
      { url: urls[0], ok: true, blob: 'AAEC/w==', mime: 'application/octet-stream' },
      {
        url: 'https://example.com/missing.png',
        ok: false,
        error: 'not-found',
        message: 'missing',
      },
    ];

    handleResourceMessage({ type: 'resource.bytesMany.result', id: sent.id, items });

    const result = await promise;
    expect(result[1]).toEqual(items[1]);
    expect(result[0].ok).toBe(true);
    if (result[0].ok) expect(Array.from(new Uint8Array(await result[0].blob.arrayBuffer()))).toEqual([0, 1, 2, 255]);
  });

  it('rejects top-level resource.bytesMany errors', async () => {
    const { bytesMany, handleResourceMessage } = await import('./shim.js');

    const promise = bytesMany(['https://example.com/a.png']);
    const sent = lastPosted('resource.bytesMany');
    handleResourceMessage({
      type: 'resource.bytesMany.error',
      id: sent.id,
      error: 'too-large',
      message: 'bulk URL cap exceeded',
    });

    await expect(promise).rejects.toThrow('too-large: bulk URL cap exceeded');
  });

  it('rejects empty bytesMany input without posting an envelope', async () => {
    const { bytesMany } = await import('./shim.js');

    await expect(bytesMany([])).rejects.toThrow('invalid-request');
    expect(posted).toHaveLength(0);
  });

  it('sends resource.cancel on bytesMany abort and drops late results', async () => {
    const { bytesMany, handleResourceMessage } = await import('./shim.js');
    const controller = new AbortController();

    const promise = bytesMany(['https://example.com/a.png'], { signal: controller.signal });
    const sent = lastPosted('resource.bytesMany');

    controller.abort();
    expect(lastPosted('resource.cancel')).toEqual({
      type: 'resource.cancel',
      id: sent.id,
    });

    handleResourceMessage({
      type: 'resource.bytesMany.result',
      id: sent.id,
      items: [
        {
          url: 'https://example.com/a.png',
          ok: true,
          blob: 'bGF0ZQ==',
          mime: 'text/plain',
        },
      ],
    });

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('ignores uncorrelated bulk terminal envelopes without throwing', async () => {
    const { handleResourceMessage } = await import('./shim.js');

    expect(() => handleResourceMessage({
      type: 'resource.bytesMany.result',
      id: 'missing',
      items: [],
    })).not.toThrow();
    expect(() => handleResourceMessage({
      type: 'resource.bytesMany.error',
      id: 'missing',
      error: 'invalid-request',
    })).not.toThrow();
  });
  it.each(['Zg', 'Zh==', 'Zm9=', 'Zg===', ' Zg==', 'Zg==\n', 'AAEC_w==', 'data:;base64,Zg==', new Blob(['f']), new ArrayBuffer(1), [102], null])('rejects invalid wire bytes %j without retaining a cache entry', async (value) => {
    const { bytes, handleResourceMessage } = await import('./shim.js');
    const url = 'https://example.com/f';
    const promise = bytes(url);
    const rejected = expect(promise).rejects.toThrow('decode-failed');
    handleResourceMessage({ type: 'resource.bytes.result', id: lastPosted('resource.bytes').id, blob: value, mime: 'text/plain' });
    await rejected;
    const retry = bytes(url);
    expect(posted.filter((message) => message.type === 'resource.bytes')).toHaveLength(2);
    handleResourceMessage({ type: 'resource.bytes.result', id: lastPosted('resource.bytes').id, blob: 'Zg==', mime: 'text/plain' });
    expect(await (await retry).text()).toBe('f');
  });

  it('rejects malformed bulk results, including wrong order and host byte objects', async () => {
    const { bytesMany, handleResourceMessage } = await import('./shim.js');
    const urls = ['https://example.com/a', 'https://example.com/b'];
    const good = { url: urls[0], ok: true, blob: 'Zg==', mime: 'text/plain' };
    const second = { ...good, url: urls[1] };
    for (const items of [[], [second, good], [good, { ...second, blob: new Blob(['f']) }], [good, { url: urls[1], ok: false, error: 'not-found', blob: '' }]]) {
      const promise = bytesMany(urls);
      const rejected = expect(promise).rejects.toThrow('decode-failed');
      handleResourceMessage({ type: 'resource.bytesMany.result', id: lastPosted('resource.bytesMany').id, items });
      await rejected;
    }
  });

  it('validates sidecar bytes atomically before cache hydration', async () => {
    const { hydrateResourceCache, bytes, handleResourceMessage } = await import('./shim.js');
    const first = { url: 'https://example.com/a', blob: 'AAEC/w==', mime: 'application/octet-stream' };
    expect(() => hydrateResourceCache([first, { ...first, url: 'https://example.com/b', blob: 'Zh==' }])).toThrow('decode-failed');
    const uncached = bytes(first.url);
    expect(posted).toHaveLength(1);
    handleResourceMessage({ type: 'resource.bytes.result', id: lastPosted('resource.bytes').id, blob: '', mime: 'text/plain' });
    await uncached;
    hydrateResourceCache([first]);
    const cached = await bytes(first.url);
    expect(Array.from(new Uint8Array(await cached.arrayBuffer()))).toEqual([0, 1, 2, 255]);
    expect(posted).toHaveLength(1);
  });

  it('cancels single requests and ignores their late malformed replies', async () => {
    const { bytes, handleResourceMessage } = await import('./shim.js');
    const controller = new AbortController();
    const promise = bytes('https://example.com/a', { signal: controller.signal });
    const rejected = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    const sent = lastPosted('resource.bytes');
    controller.abort();
    expect(lastPosted('resource.cancel').id).toBe(sent.id);
    expect(() => handleResourceMessage({ type: 'resource.bytes.result', id: sent.id, blob: new Blob(), mime: '' })).not.toThrow();
    await rejected;
  });

});
