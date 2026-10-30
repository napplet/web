import { afterEach, expect, it, vi } from 'vitest';
import { meshInfo, meshPublish, meshSubscribe, meshBlobs, info, publish, subscribe, blobs } from './sdk.js';

afterEach(() => vi.unstubAllGlobals());

it('delegates mesh helpers and aliases to the injected domain without installing it', async () => {
  const result = { online: false, peers: 0, limits: { publishTtl: 0, subscribeTtl: 0 } };
  const handle = { on: vi.fn(), close: vi.fn() };
  const mesh = {
    info: vi.fn().mockResolvedValue(result),
    publish: vi.fn().mockResolvedValue({ ok: false, error: 'not granted' }),
    subscribe: vi.fn().mockReturnValue(handle),
    blobs: vi.fn().mockResolvedValue({ peers: 0, blobs: {} }),
  };
  vi.stubGlobal('window', { napplet: { mesh } });
  expect([info, publish, subscribe, blobs]).toEqual([meshInfo, meshPublish, meshSubscribe, meshBlobs]);
  await expect(meshInfo()).resolves.toBe(result);
  const template = { kind: 20666, content: 'ding' };
  await expect(meshPublish(template, { ttl: 0 })).resolves.toEqual({ ok: false, error: 'not granted' });
  expect(mesh.publish).toHaveBeenCalledExactlyOnceWith(template, { ttl: 0 });
  expect(meshSubscribe({ kinds: [9] })).toBe(handle);
  expect(mesh.subscribe).toHaveBeenCalledExactlyOnceWith({ kinds: [9] }, undefined);
  await expect(meshBlobs([])).resolves.toEqual({ peers: 0, blobs: {} });
  expect(mesh.blobs).toHaveBeenCalledExactlyOnceWith([]);
});

it('fails clearly when the runtime did not grant mesh', () => {
  vi.stubGlobal('window', { napplet: {} });
  expect(() => meshInfo()).toThrow('window.napplet.mesh is unavailable');
  expect(() => meshPublish({ kind: 1, content: 'hello' })).toThrow('window.napplet.mesh is unavailable');
  expect(() => meshSubscribe({ kinds: [1] })).toThrow('window.napplet.mesh is unavailable');
  expect(() => meshBlobs([])).toThrow('window.napplet.mesh is unavailable');
  expect(window).not.toHaveProperty('napplet.mesh');
});
