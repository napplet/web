// Proves the reported DX failure (napplet/web#67) is fixed end-to-end through a
// real NAP shim: a Svelte/Vue-style reactive Proxy passed to outbox.subscribe()
// is no longer silently dropped at the NIP-5D port boundary. The fake shell's
// port structured-clones every envelope, so a reactive proxy throws a real
// DataCloneError exactly as a browser MessagePort would.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setCloneMode, clearCloneWarnings } from '@napplet/core';
import { installFakeShell, type FakeShell } from './test-support/fake-shell.js';

const PROXIES = new WeakSet<object>();

/** Wrap an object in a clone-hostile Proxy, like Svelte 5 $state. */
function reactive<T extends object>(obj: T): T {
  const p = new Proxy(obj, {});
  PROXIES.add(p);
  return p;
}

let shell: FakeShell;
let uuid: number;

beforeEach(() => {
  uuid = 0;
  setCloneMode('auto');
  clearCloneWarnings();
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { randomUUID: () => `id-${++uuid}` },
  });
  shell = installFakeShell();
});

afterEach(() => {
  setCloneMode('auto');
  vi.unstubAllGlobals();
  Reflect.deleteProperty(globalThis, 'crypto');
});

/** Find the last envelope of a given type the napplet sent over the port. */
function sentOfType(type: string): any {
  return [...shell.sent].reverse().find((m) => m.type === type);
}

describe('NAP shim boundary recovery (napplet/web#67)', () => {
  it('the fake port rejects a reactive proxy with a real DataCloneError', () => {
    expect(() => structuredClone(reactive([{ kinds: [1] }]))).toThrow(
      expect.objectContaining({ name: 'DataCloneError' }),
    );
  });

  it('auto: outbox.subscribe with a reactive proxy reaches the shell as a snapshot', async () => {
    const { subscribe } = await import('./outbox/shim.js');
    const filters = reactive([{ kinds: [1] }]);
    const relays = reactive(['wss://a']);

    // Before the fix this threw DataCloneError (swallowed in async paths) and the
    // envelope never crossed the boundary. Now it must not throw and must arrive.
    const sub = subscribe(filters, { relays, live: true } as any);
    expect(sub).toBeTruthy();

    const sent = sentOfType('outbox.subscribe');
    expect(sent).toBeTruthy();
    expect(sent.filters).toEqual([{ kinds: [1] }]);
    expect(PROXIES.has(sent.filters)).toBe(false);
    expect(sent.options.relays).toEqual(['wss://a']);
    expect(shell.windowMessages).toEqual([]);
  });

  it('strict: the same call throws a loud, actionable, synchronous error', async () => {
    setCloneMode('strict');
    const { subscribe } = await import('./outbox/shim.js');
    const filters = reactive([{ kinds: [1] }]);
    expect(() => subscribe(filters)).toThrow(/outbox\.subscribe/);
    expect(sentOfType('outbox.subscribe')).toBeUndefined();
  });

  it('auto: a plain (already-cloneable) call is posted untouched', async () => {
    const { query } = await import('./outbox/shim.js');
    void query([{ kinds: [1] }]);
    const sent = sentOfType('outbox.query');
    expect(sent).toBeTruthy();
    expect(sent.filters).toEqual([{ kinds: [1] }]);
  });
});
