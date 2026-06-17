// Proves the reported DX failure (napplet/web#67) is fixed end-to-end through a
// real NAP shim: a Svelte/Vue-style reactive Proxy passed to outbox.subscribe()
// is no longer silently dropped at the postMessage boundary. The mocked
// window.parent.postMessage here throws a DataCloneError on non-cloneable input,
// mirroring the browser's structured-clone behavior.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setCloneMode, clearCloneWarnings } from '@napplet/core';

const PROXIES = new WeakSet<object>();

/** Wrap an object in a clone-hostile Proxy, like Svelte 5 $state. */
function reactive<T extends object>(obj: T): T {
  const p = new Proxy(obj, {});
  PROXIES.add(p);
  return p;
}

function assertCloneable(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'function') throw dataCloneError();
    return;
  }
  const obj = value as object;
  if (PROXIES.has(obj)) throw dataCloneError();
  if (seen.has(obj)) return;
  seen.add(obj);
  if (obj instanceof Date || ArrayBuffer.isView(obj)) return;
  if (Array.isArray(obj)) { for (const v of obj) assertCloneable(v, seen); return; }
  for (const k of Object.keys(obj)) assertCloneable((obj as Record<string, unknown>)[k], seen);
}

function dataCloneError(): Error {
  const err = new Error('could not be cloned');
  err.name = 'DataCloneError';
  return err;
}

let posted: any[];
let uuid: number;

beforeEach(() => {
  posted = [];
  uuid = 0;
  setCloneMode('auto');
  clearCloneWarnings();
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { randomUUID: () => `id-${++uuid}` },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      parent: {
        postMessage(msg: unknown) {
          assertCloneable(msg); // throws DataCloneError on a reactive proxy
          posted.push(msg);
        },
      },
    },
  });
});

afterEach(() => {
  setCloneMode('auto');
  Reflect.deleteProperty(globalThis, 'window');
  Reflect.deleteProperty(globalThis, 'crypto');
});

describe('NAP shim boundary recovery (napplet/web#67)', () => {
  it('auto: outbox.subscribe with a reactive proxy reaches the shell as a snapshot', async () => {
    const { subscribe } = await import('./outbox/shim.js');
    const filters = reactive([{ kinds: [1] }]);
    const relays = reactive(['wss://a']);

    // Before the fix this threw DataCloneError (swallowed in async paths) and the
    // envelope never crossed the boundary. Now it must not throw and must arrive.
    const sub = subscribe(filters, { relays, live: true } as any);
    expect(sub).toBeTruthy();

    const sent = posted.find((m) => m.type === 'outbox.subscribe');
    expect(sent).toBeTruthy();
    expect(sent.filters).toEqual([{ kinds: [1] }]);
    expect(PROXIES.has(sent.filters)).toBe(false);
    expect(sent.options.relays).toEqual(['wss://a']);
  });

  it('strict: the same call throws a loud, actionable, synchronous error', async () => {
    setCloneMode('strict');
    const { subscribe } = await import('./outbox/shim.js');
    const filters = reactive([{ kinds: [1] }]);
    expect(() => subscribe(filters)).toThrow(/outbox\.subscribe/);
    expect(posted.find((m) => m.type === 'outbox.subscribe')).toBeUndefined();
  });

  it('auto: a plain (already-cloneable) call is posted untouched', async () => {
    const { query } = await import('./outbox/shim.js');
    void query([{ kinds: [1] }]);
    const sent = posted.find((m) => m.type === 'outbox.query');
    expect(sent).toBeTruthy();
    expect(sent.filters).toEqual([{ kinds: [1] }]);
  });
});
