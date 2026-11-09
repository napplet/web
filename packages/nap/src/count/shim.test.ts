import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeShell, type FakeShell } from '../test-support/fake-shell.js';

let shell: FakeShell;
let uuidCounter: number;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `count-test-${++uuidCounter}`,
    },
  });

  shell = installFakeShell();

  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'crypto');
  }
  vi.unstubAllGlobals();
});

function lastPosted(type: string): any {
  for (let i = shell.sent.length - 1; i >= 0; i--) {
    if (shell.sent[i]?.type === type) return shell.sent[i];
  }
  throw new Error(`no posted message of type ${type}`);
}

describe('@napplet/nap/count shim', () => {
  it('posts count.query with a non-empty filter array and resolves count results', async () => {
    const { query, handleCountMessage } = await import('./shim.js');

    const promise = query({ kinds: [7], '#e': ['event-id'] }, { approximate: false, hll: true });
    const sent = lastPosted('count.query');
    expect(sent).toEqual({
      type: 'count.query',
      id: 'count-test-1',
      filters: [{ kinds: [7], '#e': ['event-id'] }],
      options: { approximate: false, hll: true },
    });

    handleCountMessage({
      type: 'count.query.result',
      id: sent.id,
      ok: true,
      count: 42,
      approximate: true,
      hll: 'hll-value',
      relays: ['wss://relay.example'],
    });

    await expect(promise).resolves.toEqual({
      ok: true,
      count: 42,
      approximate: true,
      hll: 'hll-value',
      relays: ['wss://relay.example'],
    });
  });

  it('rejects empty filter arrays before posting', async () => {
    const { query } = await import('./shim.js');

    await expect(query([])).rejects.toThrow('count.query requires at least one filter');
    expect(shell.sent).toHaveLength(0);
    expect(shell.windowMessages).toHaveLength(0);
  });
});
