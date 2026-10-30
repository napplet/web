import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BlossomApi } from '@napplet/core';
import * as sdk from './sdk.js';
import { parseUri, formatUri } from './uri.js';

afterEach(() => vi.unstubAllGlobals());
const server = 'https://cdn.example.com';
const sha256 = 'b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553';

describe('NAP-BLOSSOM application helpers', () => {
  it('keeps import side-effect free and rejects unavailable domains clearly', () => {
    vi.stubGlobal('window', undefined);
    expect(() => sdk.blossomServers()).toThrow('window.napplet.blossom is unavailable');
    vi.stubGlobal('window', { napplet: {} });
    expect(() => sdk.servers()).toThrow('runtime did not inject this domain');
  });
  it('delegates binary writes, typed failures, and list mutations to the current injected domain', async () => {
    const data = new Uint8Array([0, 128, 255]).buffer;
    const request = { server, data, sha256 };
    const result = { ok: false, status: 0, error: 'user-denied' };
    const upload = vi.fn().mockResolvedValue(result);
    const removeServer = vi.fn().mockResolvedValue({ ok: false, servers: [server], error: 'empty-server-list' });
    const first = { upload, removeServer } satisfies Partial<BlossomApi>;
    vi.stubGlobal('window', { napplet: { blossom: first } });
    await expect(sdk.blossomUpload(request)).resolves.toBe(result);
    expect(upload).toHaveBeenCalledWith(request);
    await expect(sdk.removeServer(server)).resolves.toMatchObject({ error: 'empty-server-list' });
    expect(removeServer).toHaveBeenCalledWith(server);
    const next = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal('window', { napplet: { blossom: { upload: next } } });
    await sdk.upload(request);
    expect(next).toHaveBeenCalledWith(request);
  });
  it('exposes every ergonomic alias and local URI helper', () => {
    const names = ['check', 'get', 'checkUpload', 'upload', 'mirror', 'checkMedia', 'media', 'list', 'delete', 'servers', 'addServer', 'removeServer', 'reorderServers', 'parseUri', 'formatUri'] as const;
    for (const name of names) {
      const prefixed = `blossom${name[0].toUpperCase()}${name.slice(1)}` as keyof typeof sdk;
      expect(sdk[name]).toBe(sdk[prefixed]);
    }
    vi.stubGlobal('window', { napplet: { blossom: { parseUri, formatUri } } });
    const uri = `blossom:${sha256}.pdf`;
    expect(sdk.blossomFormatUri(sdk.blossomParseUri(uri))).toBe(uri);
  });
});
