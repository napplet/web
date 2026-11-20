import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeShell, type FakeShell } from '../test-support/fake-shell.js';
import type { ResourceBytesWireItem, ResourceInfo } from './types.js';

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

  // NAP-RESOURCE §Schemes `data:` row: wherever a data: URL is decoded it must be size-limited,
  // MIME-sniffed, and SVG-rasterized. The shim does none of that, so data: goes to the runtime.
  it('routes data URLs to the runtime instead of decoding them in the shim', async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error('fetch must not be used');
    });
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: fetchSpy,
    });

    const { bytes, handleResourceMessage } = await import('./shim.js');

    const url = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E';
    const promise = bytes(url);
    const sent = lastPosted('resource.bytes');
    expect(sent).toEqual({ type: 'resource.bytes', id: 'resource-test-1', url });

    // The runtime answers with rasterized PNG bytes; the declared SVG type is never trusted.
    handleResourceMessage({ type: 'resource.bytes.result', id: sent.id, blob: 'iVBORw0KGgo=', mime: 'image/png' });

    const blob = await promise;
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(blob.type).toBe('image/png');
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  // NAP-RESOURCE §Hashtree references: a bare nhash is an accepted alias the runtime dispatches,
  // and malformed URLs are the runtime's `invalid-request`, so the shim does not pre-parse URLs.
  it.each(['nhash1qqsexamplewithoutascheme', 'not a url'])('forwards %s to the runtime unparsed', async (url) => {
    const { bytes } = await import('./shim.js');

    const promise = bytes(url);
    expect(lastPosted('resource.bytes')).toEqual({ type: 'resource.bytes', id: 'resource-test-1', url });
    promise.catch(() => undefined);
  });

  // NAP-RESOURCE §Byte encoding: the spec vector `00 01 02 ff` <-> "AAEC/w==", plus RFC 4648 §10.
  it.each([
    ['', []],
    ['Zg==', [0x66]],
    ['Zm8=', [0x66, 0x6f]],
    ['Zm9v', [0x66, 0x6f, 0x6f]],
    ['Zm9vYg==', [0x66, 0x6f, 0x6f, 0x62]],
    ['Zm9vYmE=', [0x66, 0x6f, 0x6f, 0x62, 0x61]],
    ['Zm9vYmFy', [0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72]],
    ['AAEC/w==', [0x00, 0x01, 0x02, 0xff]],
  ])('decodes canonical ResourceBytes %j into a Blob typed with mime', async (wire, octets) => {
    const { bytes, handleResourceMessage } = await import('./shim.js');

    const promise = bytes('https://example.com/r.bin');
    const sent = lastPosted('resource.bytes');
    handleResourceMessage({ type: 'resource.bytes.result', id: sent.id, blob: wire, mime: 'application/octet-stream' });

    const blob = await promise;
    expect(blob.type).toBe('application/octet-stream');
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual(octets);
  });

  // NAP-RESOURCE §Byte encoding: receivers MUST reject non-canonical encodings and host byte objects;
  // web projection §Resource binding: invalid encoding MUST NOT reach a success callback.
  it.each([
    ['unpadded', 'Zg'],
    ['whitespace', 'Zm9v\nYmFy'],
    ['non-zero pad bits', 'Zh=='],
    ['URL-safe alphabet', 'AAEC_w=='],
    ['data-URL prefix', 'data:application/octet-stream;base64,AAEC/w=='],
    ['Blob', new Blob(['hi'])],
    ['integer array', [0, 1, 2, 255]],
    ['ArrayBuffer', new ArrayBuffer(4)],
  ])('rejects a %s wire blob', async (_label, wire) => {
    const { bytes, handleResourceMessage } = await import('./shim.js');

    const promise = bytes('https://example.com/r.bin');
    const sent = lastPosted('resource.bytes');
    handleResourceMessage({ type: 'resource.bytes.result', id: sent.id, blob: wire, mime: 'application/octet-stream' });

    await expect(promise).rejects.toThrow('invalid ResourceBytes');
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
      blob: 'b2s=',
      mime: 'application/octet-stream',
    });

    const blob = await promise;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toBe('ok');
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

    const items: ResourceBytesWireItem[] = [
      { url: 'blossom:abc123.bin?xs=cdn.example', ok: true, blob: 'AAEC/w==', mime: 'image/png' },
      {
        url: 'https://example.com/missing.png',
        ok: false,
        error: 'not-found',
        message: 'missing',
      },
    ];

    handleResourceMessage({ type: 'resource.bytesMany.result', id: sent.id, items });

    const [ok, failed] = await promise;
    expect(ok.ok).toBe(true);
    if (!ok.ok) throw new Error('expected ok item');
    expect(ok.url).toBe('blossom:abc123.bin?xs=cdn.example');
    expect(ok.mime).toBe('image/png');
    expect(ok.blob.type).toBe('image/png');
    expect([...new Uint8Array(await ok.blob.arrayBuffer())]).toEqual([0x00, 0x01, 0x02, 0xff]);
    expect(failed).toEqual(items[1]);
  });

  // Web projection §Resource binding: invalid encoding is a protocol failure, so the whole call
  // rejects rather than inventing a runtime-attributed item error.
  it.each([
    ['a non-canonical item blob', [{ url: 'https://example.com/a.png', ok: true, blob: 'Zg', mime: 'image/png' }]],
    ['a Blob item blob', [{ url: 'https://example.com/a.png', ok: true, blob: new Blob(['a']), mime: 'image/png' }]],
    ['a failed item carrying blob', [{ url: 'https://example.com/a.png', ok: false, error: 'not-found', blob: 'Zg==' }]],
    ['a length mismatch', []],
  ])('rejects bytesMany when the result has %s', async (_label, items) => {
    const { bytesMany, handleResourceMessage } = await import('./shim.js');

    const promise = bytesMany(['https://example.com/a.png']);
    const sent = lastPosted('resource.bytesMany');
    handleResourceMessage({ type: 'resource.bytesMany.result', id: sent.id, items });

    await expect(promise).rejects.toThrow(/invalid/);
  });

  // NAP-RESOURCE §Sidecar Pre-Resolution + web projection: sidecar blobs are ResourceBytes and are
  // decoded before cache hydration; invalid entries never reach the cache.
  it('hydrates decoded sidecar entries and skips invalid encodings', async () => {
    const { bytes, hydrateResourceCache } = await import('./shim.js');

    hydrateResourceCache([
      { url: 'https://example.com/good.png', blob: 'AAEC/w==', mime: 'image/png' },
      { url: 'https://example.com/bad.png', blob: 'Zg', mime: 'image/png' },
    ]);

    const good = await bytes('https://example.com/good.png');
    expect(good.type).toBe('image/png');
    expect([...new Uint8Array(await good.arrayBuffer())]).toEqual([0x00, 0x01, 0x02, 0xff]);
    expect(shell.sent).toHaveLength(0);

    const bad = bytes('https://example.com/bad.png');
    expect(lastPosted('resource.bytes')).toMatchObject({ url: 'https://example.com/bad.png' });
    bad.catch(() => undefined);
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
});
