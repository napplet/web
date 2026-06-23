import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResourceBytesItem } from './types.js';

const posted: Array<Record<string, unknown>> = [];
let uuidCounter = 0;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  posted.length = 0;
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

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
  Reflect.deleteProperty(globalThis, 'window');
});

function lastPosted(type: string): Record<string, unknown> {
  for (let i = posted.length - 1; i >= 0; i--) {
    if (posted[i].type === type) return posted[i];
  }
  throw new Error(`no posted message of type ${type}`);
}

describe('@napplet/nap/resource shim', () => {
  it('posts resource.bytesMany and resolves ordered per-URL items', async () => {
    const { bytesMany, handleResourceMessage } = await import('./shim.js');

    const promise = bytesMany(['https://example.com/a.png', 'https://example.com/missing.png']);
    const sent = lastPosted('resource.bytesMany');
    expect(sent).toEqual({
      type: 'resource.bytesMany',
      id: 'resource-test-1',
      urls: ['https://example.com/a.png', 'https://example.com/missing.png'],
    });

    const okBlob = new Blob(['a'], { type: 'image/png' });
    const items: ResourceBytesItem[] = [
      { url: 'https://example.com/a.png', ok: true, blob: okBlob, mime: 'image/png' },
      {
        url: 'https://example.com/missing.png',
        ok: false,
        error: 'not-found',
        message: 'missing',
      },
    ];

    handleResourceMessage({ type: 'resource.bytesMany.result', id: sent.id, items });

    await expect(promise).resolves.toEqual(items);
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
          blob: new Blob(['late']),
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
});
