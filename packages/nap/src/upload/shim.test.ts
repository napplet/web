import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface PostedMessage {
  msg: any;
  targetOrigin: string;
}

let postedMessages: PostedMessage[];
let uuidCounter: number;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  postedMessages = [];
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `upload-test-${++uuidCounter}`,
    },
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      parent: {
        postMessage(msg: unknown, targetOrigin: string) {
          postedMessages.push({ msg, targetOrigin });
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

/** Find the most recent posted message of a given type. */
function lastPosted(type: string): any {
  for (let i = postedMessages.length - 1; i >= 0; i--) {
    if (postedMessages[i].msg?.type === type) return postedMessages[i].msg;
  }
  throw new Error(`no posted message of type ${type}`);
}

describe('@napplet/nap/upload shim', () => {
  it('posts upload.upload (carrying the raw data) and resolves with the result', async () => {
    const { upload, handleUploadMessage } = await import('./shim.js');

    const data = { byteLength: 18234 } as unknown as ArrayBuffer; // stand-in payload
    const promise = upload({ rail: 'nip96', data, filename: 'diagram.png', mimeType: 'image/png' });
    const sent = lastPosted('upload.upload');
    expect(sent.request.rail).toBe('nip96');
    expect(sent.request.data).toBe(data); // passed by reference (structured clone on real postMessage)
    expect(sent.request.filename).toBe('diagram.png');

    handleUploadMessage({
      type: 'upload.upload.result',
      id: sent.id,
      result: { ok: true, uploadId: 'upload-1', status: 'uploading', rail: 'nip96' },
    });

    await expect(promise).resolves.toEqual({ ok: true, uploadId: 'upload-1', status: 'uploading', rail: 'nip96' });
  });

  it('resolves with ok:false results (created-then-failed) without rejecting', async () => {
    const { upload, handleUploadMessage } = await import('./shim.js');

    const promise = upload({ data: new ArrayBuffer(0) });
    const sent = lastPosted('upload.upload');
    handleUploadMessage({
      type: 'upload.upload.result',
      id: sent.id,
      result: { ok: false, uploadId: 'upload-3', status: 'cancelled', rail: 'nip96', error: 'user cancelled' },
    });

    await expect(promise).resolves.toMatchObject({ ok: false, status: 'cancelled', error: 'user cancelled' });
  });

  it('rejects when the shell returns a top-level error (no upload created)', async () => {
    const { upload, handleUploadMessage } = await import('./shim.js');

    const promise = upload({ data: new ArrayBuffer(0), rail: 'bogus' });
    const sent = lastPosted('upload.upload');
    handleUploadMessage({ type: 'upload.upload.result', id: sent.id, error: 'unsupported rail' });

    await expect(promise).rejects.toThrow('unsupported rail');
  });

  it('status() posts upload.status and resolves with the latest status', async () => {
    const { status, handleUploadMessage } = await import('./shim.js');

    const promise = status('upload-1');
    const sent = lastPosted('upload.status');
    expect(sent.uploadId).toBe('upload-1');

    handleUploadMessage({
      type: 'upload.status.result',
      id: sent.id,
      status: { ok: true, uploadId: 'upload-1', status: 'uploading', rail: 'nip96', bytesSent: 100, bytesTotal: 200, updatedAt: 123 },
    });

    await expect(promise).resolves.toMatchObject({ uploadId: 'upload-1', bytesSent: 100, bytesTotal: 200 });
  });

  it('onStatus receives upload.status.changed pushes and stops after close()', async () => {
    const { onStatus, handleUploadMessage } = await import('./shim.js');

    const received: any[] = [];
    const sub = onStatus((s) => received.push(s));

    const status = { ok: true, uploadId: 'upload-1', status: 'complete', rail: 'nip96', url: 'https://x/y.png', updatedAt: 1 };
    handleUploadMessage({ type: 'upload.status.changed', status });
    expect(received).toHaveLength(1);
    expect(received[0].url).toBe('https://x/y.png');

    sub.close();
    handleUploadMessage({ type: 'upload.status.changed', status });
    expect(received).toHaveLength(1);
  });

  it('ignores unknown and uncorrelated messages without throwing', async () => {
    const { handleUploadMessage } = await import('./shim.js');

    expect(() => handleUploadMessage({ type: 'unknown.domain' })).not.toThrow();
    expect(() => handleUploadMessage({ type: 'upload.upload.result', id: 'no-such-id' })).not.toThrow();
    expect(() => handleUploadMessage({ type: 'upload.status.changed' })).not.toThrow();
  });
});
