import { describe, expect, it } from 'vitest';
import type { ResourceApi } from '@napplet/core';
import { runtimePrelude } from './boot.js';

function harness() {
  const posted: Array<Record<string, unknown>> = [];
  const listeners: Array<(event: { source: unknown; data: unknown }) => void> = [];
  const parent = { postMessage: (message: Record<string, unknown>) => posted.push(JSON.parse(JSON.stringify(message))) };
  const window = {
    parent, crypto, setTimeout, clearTimeout,
    napplet: undefined as { resource: ResourceApi } | undefined,
    addEventListener(type: string, callback: (event: { source: unknown; data: unknown }) => void) {
      if (type === 'message') listeners.push(callback);
    },
  };
  Function('window', runtimePrelude(['resource']))(window);
  return {
    resource: window.napplet!.resource,
    posted,
    reply(data: unknown) { for (const listener of listeners) listener({ source: parent, data }); },
  };
}

describe('resource prelude wire boundary', () => {
  it.each([['', []], ['AAEC/w==', [0, 1, 2, 255]], ['Zg==', [102]], ['Zm8=', [102, 111]], ['Zm9v', [102, 111, 111]]])('decodes canonical %s octets', async (encoded, bytes) => {
    const h = harness();
    const result = h.resource.bytes('https://example.com/blob');
    h.reply({ type: 'resource.bytes.result', id: h.posted[0].id, blob: encoded, mime: 'application/octet-stream' });
    expect(Array.from(new Uint8Array(await (await result).arrayBuffer()))).toEqual(bytes);
  });

  it.each(['Zg', 'Zh==', 'Zm9=', 'Zg===', ' Zg==', 'Zg==\n', 'AAEC_w==', new Blob(['f']), new ArrayBuffer(1), [102], null])('rejects malformed wire bytes %j', async (blob) => {
    const h = harness();
    const result = h.resource.bytes('https://example.com/blob');
    const rejected = expect(result).rejects.toThrow('decode-failed');
    h.reply({ type: 'resource.bytes.result', id: h.posted[0].id, blob, mime: 'text/plain' });
    await rejected;
  });

  it('preserves mixed bulk outcomes and validates length and order', async () => {
    const h = harness();
    const urls = ['https://example.com/a', 'https://example.com/b'];
    const items = [{ url: urls[0], ok: true, blob: 'Zg==', mime: 'text/plain' }, { url: urls[1], ok: false, error: 'not-found' }];
    const result = h.resource.bytesMany(urls);
    expect(h.posted[0]).toEqual({ type: 'resource.bytesMany', id: expect.any(String), urls });
    h.reply({ type: 'resource.bytesMany.result', id: h.posted[0].id, items });
    const decoded = await result;
    expect(decoded[1]).toEqual(items[1]);
    if (decoded[0].ok) expect(await decoded[0].blob.text()).toBe('f');
    for (const malformed of [[], [...items].reverse(), [{ ...items[0], blob: 'Zh==' }, items[1]]]) {
      const rejected = expect(h.resource.bytesMany(urls)).rejects.toThrow('decode-failed');
      h.reply({ type: 'resource.bytesMany.result', id: h.posted.at(-1)!.id, items: malformed });
      await rejected;
    }
  });

  it.each(['bytes', 'bytesMany'] as const)('cancels %s and ignores late results', async (operation) => {
    const h = harness();
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const work = operation === 'bytes' ? h.resource.bytes('https://example.com/a', options) : h.resource.bytesMany(['https://example.com/a'], options);
    const rejected = expect(work).rejects.toMatchObject({ name: 'AbortError' });
    const id = h.posted[0].id;
    controller.abort();
    expect(h.posted[1]).toEqual({ type: 'resource.cancel', id });
    expect(() => h.reply({ type: `resource.${operation}.result`, id, blob: new Blob(), items: [] })).not.toThrow();
    await rejected;
  });
});
