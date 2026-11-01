import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeShell, type FakeShell } from '../test-support/fake-shell.js';

let shell: FakeShell;
let uuidCounter: number;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

/** Deliver a shell -> napplet result envelope over the NIP-5D port. */
function deliverResult(data: Record<string, unknown>): void {
  shell.deliver(data);
}

beforeEach(() => {
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `storage-test-${++uuidCounter}`,
    },
  });

  shell = installFakeShell();
});

afterEach(() => {
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'crypto');
  }
  vi.unstubAllGlobals();
});

describe('@napplet/nap/storage shim', () => {
  it('emits shared (top-level) requests with NO scope field — byte-identical to today', async () => {
    const { nappletStorage, installStorageShim } = await import('./shim.js');
    installStorageShim();

    const get = nappletStorage.getItem('k');
    deliverResult({ type: 'storage.get.result', id: 'storage-test-1', value: 'v' });
    await expect(get).resolves.toBe('v');

    const set = nappletStorage.setItem('k', 'v');
    deliverResult({ type: 'storage.set.result', id: 'storage-test-2' });
    await expect(set).resolves.toBeUndefined();

    const remove = nappletStorage.removeItem('k');
    deliverResult({ type: 'storage.remove.result', id: 'storage-test-3' });
    await expect(remove).resolves.toBeUndefined();

    const keys = nappletStorage.keys();
    deliverResult({ type: 'storage.keys.result', id: 'storage-test-4', keys: ['k'] });
    await expect(keys).resolves.toEqual(['k']);

    expect(shell.sent).toEqual([
      { type: 'storage.get', id: 'storage-test-1', key: 'k' },
      { type: 'storage.set', id: 'storage-test-2', key: 'k', value: 'v' },
      { type: 'storage.remove', id: 'storage-test-3', key: 'k' },
      { type: 'storage.keys', id: 'storage-test-4' },
    ]);
    for (const msg of shell.sent) {
      expect('scope' in msg).toBe(false);
    }
  });

  it('emits instance.* requests with scope: "instance"', async () => {
    const { nappletStorage, installStorageShim } = await import('./shim.js');
    installStorageShim();

    const get = nappletStorage.instance.getItem('k');
    deliverResult({ type: 'storage.get.result', id: 'storage-test-1', value: 'v' });
    await expect(get).resolves.toBe('v');

    const set = nappletStorage.instance.setItem('k', 'v');
    deliverResult({ type: 'storage.set.result', id: 'storage-test-2' });
    await expect(set).resolves.toBeUndefined();

    const remove = nappletStorage.instance.removeItem('k');
    deliverResult({ type: 'storage.remove.result', id: 'storage-test-3' });
    await expect(remove).resolves.toBeUndefined();

    const keys = nappletStorage.instance.keys();
    deliverResult({ type: 'storage.keys.result', id: 'storage-test-4', keys: ['k'] });
    await expect(keys).resolves.toEqual(['k']);

    expect(shell.sent).toEqual([
      { type: 'storage.get', id: 'storage-test-1', key: 'k', scope: 'instance' },
      { type: 'storage.set', id: 'storage-test-2', key: 'k', value: 'v', scope: 'instance' },
      { type: 'storage.remove', id: 'storage-test-3', key: 'k', scope: 'instance' },
      { type: 'storage.keys', id: 'storage-test-4', scope: 'instance' },
    ]);
  });

  it('correlates results by id and rejects on error', async () => {
    const { nappletStorage, installStorageShim } = await import('./shim.js');
    installStorageShim();

    const first = nappletStorage.getItem('a'); // storage-test-1
    const second = nappletStorage.getItem('b'); // storage-test-2

    // Resolve the second request first — correlation is by id, not order.
    deliverResult({ type: 'storage.get.result', id: 'storage-test-2', value: 'B' });
    await expect(second).resolves.toBe('B');

    deliverResult({ type: 'storage.get.result', id: 'storage-test-1', error: 'denied' });
    await expect(first).rejects.toThrow('denied');
  });
});
