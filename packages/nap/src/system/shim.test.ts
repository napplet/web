import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface PostedMessage {
  msg: unknown;
  targetOrigin: string;
}

let postedMessages: PostedMessage[];
let uuidCounter: number;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  postedMessages = [];
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `system-test-${++uuidCounter}`,
    },
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      parent: {
        postMessage(msg: unknown, targetOrigin: string) {
          postedMessages.push({ msg, targetOrigin });
        },
      },
    },
  });

  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'crypto');
  }
  Reflect.deleteProperty(globalThis, 'window');
});

describe('@napplet/nap/system shim', () => {
  it('requests NAP support snapshots', async () => {
    const { handleSystemMessage, naps } = await import('./shim.js');

    const result = naps();

    expect(postedMessages).toEqual([
      { msg: { type: 'system.naps', id: 'system-test-1' }, targetOrigin: '*' },
    ]);

    handleSystemMessage({
      type: 'system.naps.result',
      id: 'system-test-1',
      naps: [{ domain: 'storage', supported: true, health: 'ok' }],
    });

    await expect(result).resolves.toEqual([{ domain: 'storage', supported: true, health: 'ok' }]);
  });

  it('requests storage-like status snapshots', async () => {
    const { eventCache, handleSystemMessage } = await import('./shim.js');

    const result = eventCache();

    expect(postedMessages).toEqual([
      { msg: { type: 'system.eventCache', id: 'system-test-1' }, targetOrigin: '*' },
    ]);

    handleSystemMessage({
      type: 'system.eventCache.result',
      id: 'system-test-1',
      status: { available: true, health: 'ok', bytesUsed: 4096, persistent: true },
    });

    await expect(result).resolves.toEqual({
      available: true,
      health: 'ok',
      bytesUsed: 4096,
      persistent: true,
    });
  });

  it('requests named scoped status', async () => {
    const { handleSystemMessage, scope } = await import('./shim.js');

    const result = scope('media');

    expect(postedMessages).toEqual([
      { msg: { type: 'system.scope', id: 'system-test-1', name: 'media' }, targetOrigin: '*' },
    ]);

    handleSystemMessage({
      type: 'system.scope.result',
      id: 'system-test-1',
      scope: { name: 'media', available: true, health: 'ok', details: { activeSessions: 1 } },
    });

    await expect(result).resolves.toEqual({
      name: 'media',
      available: true,
      health: 'ok',
      details: { activeSessions: 1 },
    });
  });

  it('rejects runtime errors', async () => {
    const { handleSystemMessage, services } = await import('./shim.js');

    const result = services();

    handleSystemMessage({
      type: 'system.services.result',
      id: 'system-test-1',
      error: 'policy denied',
    });

    await expect(result).rejects.toThrow('policy denied');
  });

  it('ignores mismatched result types for the same id', async () => {
    const { handleSystemMessage, relays } = await import('./shim.js');

    const result = relays();

    handleSystemMessage({
      type: 'system.services.result',
      id: 'system-test-1',
      services: [],
    });
    handleSystemMessage({
      type: 'system.relays.result',
      id: 'system-test-1',
      relays: [{ url: 'wss://relay.example', read: true, write: false, connected: true, health: 'ok' }],
    });

    await expect(result).resolves.toEqual([
      { url: 'wss://relay.example', read: true, write: false, connected: true, health: 'ok' },
    ]);
  });
});
