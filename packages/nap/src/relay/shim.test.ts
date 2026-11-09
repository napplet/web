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
      randomUUID: () => `relay-test-${++uuidCounter}`,
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

function emitFromParent(data: unknown): void {
  shell.deliver(data);
}

describe('@napplet/nap/relay shim', () => {
  it('resolves relay.query results without events to an empty array', async () => {
    const { query } = await import('./shim.js');

    const promise = query({ kinds: [1] });
    const sent = lastPosted('relay.query');
    expect(sent).toEqual({
      type: 'relay.query',
      id: 'relay-test-1',
      filters: [{ kinds: [1] }],
    });

    emitFromParent({
      type: 'relay.query.result',
      id: sent.id,
    });

    await expect(promise).resolves.toEqual([]);
  });
});
