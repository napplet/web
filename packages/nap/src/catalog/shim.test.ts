import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get, handleCatalogMessage, installCatalogShim } from './shim.js';

const snapshot = {
  napplets: [{
    id: 'opaque:note',
    identity: { kind: 35129, pubkey: 'a'.repeat(64), eventId: 'b'.repeat(64), dTag: 'note', artifactHash: 'c'.repeat(64) },
    description: 'Displays a note.', requires: [], optional: ['theme'],
    archetypes: [{ archetype: 'note', intents: [{ intent: 'open', convention: 'napplet:note/open', parameters: ['id'] }] }],
  }],
  handlers: [{ archetype: 'note', currentHandler: 'opaque:note' }],
};
const empty = { napplets: [], handlers: [] };
let cleanup: () => void;
let posted: { type: string; id: string }[];

beforeEach(() => {
  vi.useFakeTimers();
  posted = [];
  vi.stubGlobal('window', { parent: { postMessage: (message: { type: string; id: string }) => posted.push(message) } });
  cleanup = installCatalogShim();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('catalog request lifecycle', () => {
  it('preserves complete metadata and correlates concurrent results out of order', async () => {
    const first = get();
    const second = get();
    expect(posted.map(({ type }) => type)).toEqual(['catalog.get', 'catalog.get']);
    expect(posted[0].id).not.toBe(posted[1].id);
    expect(Object.keys(posted[0]).sort()).toEqual(['id', 'type']);
    handleCatalogMessage({ type: 'catalog.get.result', id: 'unmatched', snapshot });
    handleCatalogMessage({ type: 'catalog.changed', id: posted[0].id, snapshot });
    expect(vi.getTimerCount()).toBe(2);
    handleCatalogMessage({ type: 'catalog.get.result', id: posted[1].id, snapshot: empty });
    handleCatalogMessage({ type: 'catalog.get.result', id: posted[0].id, snapshot });
    await expect(first).resolves.toEqual(snapshot);
    await expect(second).resolves.toEqual(empty);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['catalog unavailable', ''])('rejects a present runtime error %j', async (error) => {
    const result = get();
    const rejected = expect(result).rejects.toThrow(error);
    handleCatalogMessage({ type: 'catalog.get.result', id: posted[0].id, error });
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects malformed responses instead of returning an absent snapshot', async () => {
    const result = get();
    const rejected = expect(result).rejects.toThrow('Invalid catalog.get.result');
    handleCatalogMessage({ type: 'catalog.get.result', id: posted[0].id });
    await rejected;
  });

  it('times out and ignores late results', async () => {
    const result = get();
    const rejected = expect(result).rejects.toThrow('catalog.get timed out');
    await vi.advanceTimersByTimeAsync(30_000);
    await rejected;
    handleCatalogMessage({ type: 'catalog.get.result', id: posted[0].id, snapshot });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects pending calls on cleanup and permits reinstall', async () => {
    const result = get();
    const rejected = expect(result).rejects.toThrow('Catalog shim disposed');
    const redundantCleanup = installCatalogShim();
    redundantCleanup();
    expect(vi.getTimerCount()).toBe(1);
    cleanup();
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
    const previousCleanup = cleanup;
    cleanup = installCatalogShim();
    const next = get();
    previousCleanup();
    expect(vi.getTimerCount()).toBe(1);
    handleCatalogMessage({ type: 'catalog.get.result', id: posted[1].id, snapshot: empty });
    await expect(next).resolves.toEqual(empty);
  });

  it('clears pending work if transport throws', async () => {
    window.parent.postMessage = () => { throw new Error('transport failed'); };
    await expect(get()).rejects.toThrow('transport failed');
    expect(vi.getTimerCount()).toBe(0);
  });
});
