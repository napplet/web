import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeShell, type FakeShell } from '../test-support/fake-shell.js';
import type { ResourceBytesItem, ResourceInfo } from './types.js';

let shell: FakeShell;
let uuidCounter = 0;
let originalCryptoDescriptor: PropertyDescriptor | undefined;
let originalFetchDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  originalFetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `resource-test-${++uuidCounter}`,
    },
  });

  shell = installFakeShell();

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
  vi.unstubAllGlobals();
});

function lastPosted(type: string): Record<string, unknown> {
  for (let i = shell.sent.length - 1; i >= 0; i--) {
    if (shell.sent[i].type === type) return shell.sent[i];
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

  it('decodes data URLs without browser fetch or shell messages', async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error('fetch should not be used for data URLs');
    });
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: fetchSpy,
    });

    const { bytes } = await import('./shim.js');

    const blob = await bytes('data:text/plain;base64,aGk=');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(shell.sent).toHaveLength(0);
    expect(blob.type).toBe('text/plain');
    await expect(blob.text()).resolves.toBe('hi');
  });

  // NAP-RESOURCE (napplet/naps#80 @ ae5b9c64): resource.bytes carries only `id`, `url`;
  // BUD-10 discovery hints ride inside the blossom: URI.
  it('posts resource.bytes with the BUD-10 URI and no out-of-band server list', async () => {
    const { bytes, handleResourceMessage } = await import('./shim.js');

    const promise = bytes('blossom:abc123.bin?xs=cdn.example&xs=mirror.example');
    const sent = lastPosted('resource.bytes');
    expect(sent).toEqual({
      type: 'resource.bytes',
      id: 'resource-test-1',
      url: 'blossom:abc123.bin?xs=cdn.example&xs=mirror.example',
    });

    handleResourceMessage({
      type: 'resource.bytes.result',
      id: sent.id,
      blob: new Blob(['ok']),
      mime: 'application/octet-stream',
    });

    await expect(promise).resolves.toBeInstanceOf(Blob);
  });

  // NAP-RESOURCE (napplet/naps#80 @ ae5b9c64) §Wire Protocol: resource.bytesMany carries `id`, `urls`.
  it('posts resource.bytesMany with a urls list', async () => {
    const { bytesMany, handleResourceMessage } = await import('./shim.js');

    const urls = ['blossom:abc123.bin?xs=cdn.example', 'https://example.com/missing.png'];
    const promise = bytesMany(urls);
    const sent = lastPosted('resource.bytesMany');
    expect(sent).toEqual({
      type: 'resource.bytesMany',
      id: 'resource-test-1',
      urls,
    });
    expect(sent).not.toHaveProperty('requests');

    const okBlob = new Blob(['a'], { type: 'image/png' });
    const items: ResourceBytesItem[] = [
      { url: 'blossom:abc123.bin?xs=cdn.example', ok: true, blob: okBlob, mime: 'image/png' },
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
    expect(shell.sent).toHaveLength(0);
  });

  it('rejects the retired request-object input without posting an envelope', async () => {
    const { bytesMany } = await import('./shim.js');
    const legacy = [{ url: 'https://example.com/a.png' }] as unknown as string[];

    await expect(bytesMany(legacy)).rejects.toThrow('bytesMany takes URL strings, not request objects');
    expect(shell.sent).toHaveLength(0);
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
