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
      randomUUID: () => `identity-test-${++uuidCounter}`,
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
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'crypto');
  }
  Reflect.deleteProperty(globalThis, 'window');
});

describe('@napplet/nap/identity shim', () => {
  it('getPublicKey resolves an empty string when no user/signer is connected', async () => {
    const { getPublicKey, handleIdentityMessage } = await import('./shim.js');

    const result = getPublicKey();

    expect(postedMessages).toEqual([
      {
        msg: { type: 'identity.getPublicKey', id: 'identity-test-1' },
        targetOrigin: '*',
      },
    ]);

    handleIdentityMessage({
      type: 'identity.getPublicKey.result',
      id: 'identity-test-1',
      pubkey: '',
    });

    await expect(result).resolves.toBe('');
  });

  it('clears request timeouts for non-public-key identity results', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { getRelays, handleIdentityMessage } = await import('./shim.js');

    const result = getRelays();

    handleIdentityMessage({
      type: 'identity.getRelays.result',
      id: 'identity-test-1',
      relays: {},
    });

    await expect(result).resolves.toEqual({});
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });

  it('onChanged fans out identity.changed pubkey updates until closed', async () => {
    const { handleIdentityMessage, onChanged } = await import('./shim.js');
    const seen: string[] = [];

    const sub = onChanged((pubkey) => {
      seen.push(pubkey);
    });

    handleIdentityMessage({ type: 'identity.changed', pubkey: 'ab12' });
    handleIdentityMessage({ type: 'identity.changed', pubkey: '' });
    sub.close();
    handleIdentityMessage({ type: 'identity.changed', pubkey: 'cd34' });

    expect(seen).toEqual(['ab12', '']);
  });

  it('install cleanup clears change handlers', async () => {
    const { handleIdentityMessage, installIdentityShim, onChanged } = await import('./shim.js');
    const cleanup = installIdentityShim();
    const seen: string[] = [];

    onChanged((pubkey) => {
      seen.push(pubkey);
    });

    cleanup();
    handleIdentityMessage({ type: 'identity.changed', pubkey: 'ab12' });

    expect(seen).toEqual([]);
  });

  it('does not export the removed identity.decrypt helper', async () => {
    const shim = await import('./shim.js');

    expect('decrypt' in shim).toBe(false);
  });
});
