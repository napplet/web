import { createHash } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';
import { bytes, bytesMany, handleResourceMessage, installResourceShim } from '@napplet/nap/resource';
import { ResourceRuntime } from './loader.js';

afterEach(() => vi.unstubAllGlobals());

it('loads verified optimizer assets through JSON URLs and canonical base64 wire results', async () => {
  const values = [new Uint8Array([0, 1, 2, 255]), new Uint8Array([102])];
  const entries = values.map((value, index) => {
    const sha256 = createHash('sha256').update(value).digest('hex');
    return { source: `assets/${index}.bin`, uri: `blossom:${sha256}.bin`, sha256, bytes: value.length, mime: 'application/octet-stream' };
  });
  const sent: Array<Record<string, unknown>> = [];
  const cleanup = installResourceShim();
  const host = {
    parent: {
      postMessage(message: Record<string, unknown>) {
        const wire = JSON.parse(JSON.stringify(message));
        sent.push(wire);
        expect(Object.keys(wire).sort()).toEqual(['id', 'type', 'urls']);
        expect(wire.type).toBe('resource.bytesMany');
        expect(wire.urls).toEqual(entries.map((entry) => entry.uri));
        const items = entries.map((entry, index) => ({ url: entry.uri, ok: true, blob: Buffer.from(values[index]).toString('base64'), mime: entry.mime }));
        queueMicrotask(() => handleResourceMessage(JSON.parse(JSON.stringify({ type: 'resource.bytesMany.result', id: wire.id, items }))));
      },
    },
    napplet: { resource: { bytes, bytesMany } },
  };
  vi.stubGlobal('window', host);
  const runtime = new ResourceRuntime({ entries, window: host });
  try {
    const blobs = await runtime.resolveMany(entries.map((entry) => entry.source));
    expect(sent).toHaveLength(1);
    expect(await Promise.all(blobs.map(async (blob) => Array.from(new Uint8Array(await blob.arrayBuffer()))))).toEqual([[0, 1, 2, 255], [102]]);
    expect(blobs.map((blob) => blob.type)).toEqual(entries.map((entry) => entry.mime));
  } finally {
    runtime.teardown();
    cleanup();
  }
});
