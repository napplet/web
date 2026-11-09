import { afterEach, describe, expect, it, vi } from 'vitest';
import { installNappletRuntimePrelude } from './prelude.js';
import { blossom } from '@napplet/sdk/blossom';
import { installFakeShell } from '../../nap/src/test-support/fake-shell.js';

/** A window-level message, even one whose source is the parent: NIP-5D shells speak NAP only over the port. */
function deliverAtWindowLevel(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data, source: window.parent }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('runtime-injected BLOSSOM', () => {
  it('exposes only granted operations, preserves binary payloads, and accepts results only over the port', async () => {
    const shell = installFakeShell();
    const installed = installNappletRuntimePrelude({ domains: ['blossom'] });
    expect(Object.keys(installed)).toEqual(['blossom']);
    expect(shell.sent).toEqual([]);
    // happy-dom's Blob does not survive structuredClone; real Blob crossing is covered in a real browser by conformance-cli.
    const data = new Uint8Array([0, 128, 255]).buffer;
    const upload = blossom.upload({ server: 'https://cdn.example.com', data });
    const message = shell.sent[0] as { id: string; type: string; request: { server: string; data: ArrayBuffer } };
    expect(message.type).toBe('blossom.upload');
    expect(message.request.server).toBe('https://cdn.example.com');
    expect(new Uint8Array(message.request.data)).toEqual(new Uint8Array([0, 128, 255]));
    let resolved = false;
    void upload.then(() => { resolved = true; });
    const result = { ok: false, status: 0, error: 'blocked-by-policy' };
    deliverAtWindowLevel({ type: 'blossom.upload.result', id: message.id, result });
    await Promise.resolve();
    expect(resolved).toBe(false);
    shell.deliver({ type: 'blossom.upload.result', id: message.id, result });
    await expect(upload).resolves.toEqual(result);

    const get = blossom.get({ server: 'https://cdn.example.com', sha256: 'a'.repeat(64) });
    const getMessage = shell.sent[1] as { id: string };
    shell.deliver({ type: 'blossom.get.result', id: getMessage.id, result: { ok: true, status: 200, blob: new Uint8Array([1, 2, 3]).buffer } });
    expect(new Uint8Array((await get).blob as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 3]));
    expect(shell.windowMessages).toEqual([]);
    installNappletRuntimePrelude({ domains: [] });
    expect(() => blossom.servers()).toThrow('blossom');
  });
});
