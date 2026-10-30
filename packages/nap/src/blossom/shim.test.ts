import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setCloneMode } from '@napplet/core';
import * as blossom from './shim.js';

const server = 'https://cdn.example.com';
const sha256 = 'b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553';
const pubkey = 'ec4425ff5e9446080d2f70440188e3ca5d6da8713db7bdeef73d0ed54d9093f0';
const postMessage = vi.fn();
let cleanup: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', { parent: { postMessage } });
  postMessage.mockReset();
  cleanup = blossom.installBlossomShim();
});
afterEach(() => {
  cleanup();
  setCloneMode('auto');
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function sent(): { type: string; id: string; [key: string]: unknown } { return postMessage.mock.lastCall![0]; }
function respond(result: unknown): void {
  const message = sent();
  blossom.handleBlossomMessage({ type: `${message.type}.result`, id: message.id, result });
}

const failure = { ok: false, status: 0, error: 'blocked-by-policy' };
const blobRequest = { server, sha256, extension: '.pdf', auth: 'required' as const, purpose: 'Read document' };
const checkRequest = { server, sha256, size: 184292, type: 'application/pdf' };
const cases = [
  ['check', () => blossom.check(blobRequest), { request: blobRequest }, { ...failure, headers: {} }],
  ['get', () => blossom.get({ ...blobRequest, range: 'bytes=0-9' }), { request: { ...blobRequest, range: 'bytes=0-9' } }, failure],
  ['checkUpload', () => blossom.checkUpload(checkRequest), { request: checkRequest }, failure],
  ['mirror', () => blossom.mirror({ server, url: `${server}/${sha256}.pdf`, sha256 }), { request: { server, url: `${server}/${sha256}.pdf`, sha256 } }, failure],
  ['checkMedia', () => blossom.checkMedia(checkRequest), { request: checkRequest }, failure],
  ['list', () => blossom.list({ server, pubkey, cursor: sha256, limit: 10 }), { request: { server, pubkey, cursor: sha256, limit: 10 } }, { ...failure, blobs: [] }],
  ['delete', () => blossom.delete(blobRequest), { request: blobRequest }, failure],
  ['servers', () => blossom.servers(), {}, { ok: true, servers: [] }],
  ['addServer', () => blossom.addServer({ server, position: 0 }), { request: { server, position: 0 } }, { ok: false, servers: [], error: 'not-signed-in' }],
  ['removeServer', () => blossom.removeServer(server), { server }, { ok: false, servers: [server], error: 'empty-server-list' }],
  ['reorderServers', () => blossom.reorderServers([server]), { servers: [server] }, { ok: true, servers: [server] }],
] as const;

describe('NAP-BLOSSOM wire binding', () => {
  it.each(cases)('%s sends the specified envelope and preserves typed outcomes', async (operation, invoke, payload, result) => {
    const promise = invoke();
    expect(sent()).toEqual({ type: `blossom.${operation}`, id: expect.any(String), ...payload });
    expect(postMessage.mock.lastCall![1]).toBe('*');
    respond(result);
    await expect(promise).resolves.toEqual(result);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['upload', 'media'] as const)('%s preserves binary payloads and full descriptors', async (operation) => {
    for (const data of [new Blob(['raw bytes']), new Uint8Array([0, 128, 255]).buffer]) {
      const request = { server, data, sha256, type: 'application/octet-stream', size: data instanceof Blob ? data.size : data.byteLength };
      const promise = blossom[operation](request);
      expect(sent()).toEqual({ type: `blossom.${operation}`, id: expect.any(String), request });
      expect((sent().request as typeof request).data).toBe(data);
      const result = { ok: true, status: 201, descriptor: { url: `${server}/${sha256}.bin`, sha256, size: request.size, type: request.type, uploaded: 1725105921, nip94: [['x', sha256]], customMetadata: 42 } };
      respond(result);
      await expect(promise).resolves.toEqual(result);
    }
  });

  it('returns cloned native byte objects without base64 conversion', async () => {
    const promise = blossom.get(blobRequest);
    const blob = new Blob(['retrieved']);
    respond({ ok: true, status: 200, blob, headers: { contentType: 'text/plain' } });
    expect((await promise).blob).toBe(blob);
  });

  it('retains relay event sidecars and server ordering', async () => {
    const promise = blossom.servers();
    const result = { ok: true, servers: ['https://second.example', server], eventId: sha256, result: { event: { kind: 10063, tags: [['server', 'https://second.example'], ['server', server]], content: '' }, sidecar: { relayHints: ['wss://relay.example'], resources: [] } } };
    respond(result);
    await expect(promise).resolves.toEqual(result);
  });

  it('matches both request ID and operation, allowing out-of-order responses', async () => {
    const first = blossom.check(blobRequest);
    const firstId = sent().id;
    const second = blossom.get(blobRequest);
    const secondId = sent().id;
    blossom.handleBlossomMessage({ type: 'blossom.get.result', id: firstId, result: failure });
    blossom.handleBlossomMessage({ type: 'blossom.check.result', id: 'unknown', result: failure });
    expect(vi.getTimerCount()).toBe(2);
    blossom.handleBlossomMessage({ type: 'blossom.get.result', id: secondId, result: failure });
    blossom.handleBlossomMessage({ type: 'blossom.check.result', id: firstId, result: { ...failure, headers: {} } });
    await expect(first).resolves.toEqual({ ...failure, headers: {} });
    await expect(second).resolves.toEqual(failure);
  });

  it('rejects malformed-envelope errors and absent results', async () => {
    const first = blossom.servers();
    blossom.handleBlossomMessage({ type: 'blossom.servers.result', id: sent().id, error: 'invalid-request' });
    await expect(first).rejects.toThrow('invalid-request');
    const second = blossom.servers();
    blossom.handleBlossomMessage({ type: 'blossom.servers.result', id: sent().id });
    await expect(second).rejects.toThrow('returned no result');
  });

  it('expires unanswered calls and ignores late responses', async () => {
    const promise = blossom.get(blobRequest);
    const rejection = expect(promise).rejects.toThrow('blossom.get timed out');
    await vi.advanceTimersByTimeAsync(30_000);
    await rejection;
    respond({ ok: true, status: 200, blob: new Blob([]) });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up pending requests and permits a fresh installation', async () => {
    const promise = blossom.servers();
    const rejection = expect(promise).rejects.toThrow('blossom shim disposed');
    blossom.installBlossomShim()();
    expect(vi.getTimerCount()).toBe(1);
    cleanup();
    cleanup();
    await rejection;
    expect(vi.getTimerCount()).toBe(0);
    cleanup = blossom.installBlossomShim();
    const next = blossom.servers();
    respond({ ok: true, servers: [] });
    await expect(next).resolves.toEqual({ ok: true, servers: [] });
  });

  it('removes pending state when posting throws', async () => {
    setCloneMode('strict');
    postMessage.mockImplementationOnce(() => { throw new Error('transport unavailable'); });
    await expect(blossom.servers()).rejects.toThrow('transport unavailable');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('URI helpers and installation never send wire messages', () => {
    const reference = { sha256, extension: '.pdf', servers: [server], authors: [pubkey] };
    expect(blossom.parseUri(blossom.formatUri(reference))).toEqual(reference);
    expect(postMessage).not.toHaveBeenCalled();
  });
});
