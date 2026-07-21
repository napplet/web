import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface PostedMessage {
  msg: any;
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
      randomUUID: () => `lists-test-${++uuidCounter}`,
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

/** Find the most recent posted message of a given type. */
function lastPosted(type: string): any {
  for (let i = postedMessages.length - 1; i >= 0; i--) {
    if (postedMessages[i].msg?.type === type) return postedMessages[i].msg;
  }
  throw new Error(`no posted message of type ${type}`);
}

describe('@napplet/nap/lists shim', () => {
  it('posts lists.supported and resolves supported lists', async () => {
    const { supported, handleListsMessage } = await import('./shim.js');

    const promise = supported();
    const sent = lastPosted('lists.supported');
    expect(sent).toMatchObject({ id: 'lists-test-1' });

    handleListsMessage({
      type: 'lists.supported.result',
      id: sent.id,
      lists: [
        {
          kind: 10000,
          type: 'mute-list',
          addressable: false,
          supportedItemTypes: ['pubkey', 'word'],
          privateItems: true,
        },
      ],
    });

    await expect(promise).resolves.toEqual([
      {
        kind: 10000,
        type: 'mute-list',
        addressable: false,
        supportedItemTypes: ['pubkey', 'word'],
        privateItems: true,
      },
    ]);
  });

  it('posts lists.add and resolves mutation results', async () => {
    const { add, handleListsMessage } = await import('./shim.js');

    const promise = add(
      { type: 'mute-list' },
      [{ itemType: 'pubkey', value: 'abc123', visibility: 'private' }],
      { create: true, title: 'Muted' },
    );
    const sent = lastPosted('lists.add');
    expect(sent).toMatchObject({
      id: 'lists-test-1',
      list: { type: 'mute-list' },
      items: [{ itemType: 'pubkey', value: 'abc123', visibility: 'private' }],
      options: { create: true, title: 'Muted' },
    });

    handleListsMessage({
      type: 'lists.add.result',
      id: sent.id,
      ok: true,
      eventId: 'event-1',
      added: 1,
      removed: 99,
      skipped: 0,
    });

    await expect(promise).resolves.toEqual({
      ok: true,
      eventId: 'event-1',
      added: 1,
      skipped: 0,
    });
  });

  it('resolves unsupported-list remove results without rejecting', async () => {
    const { remove, handleListsMessage } = await import('./shim.js');

    const promise = remove({ kind: 30004, identifier: 'curation' }, [
      { itemType: 'address', value: '30023:pubkey:d-tag' },
    ]);
    const sent = lastPosted('lists.remove');

    handleListsMessage({
      type: 'lists.remove.result',
      id: sent.id,
      ok: false,
      error: 'unsupported-list',
      reason: 'kind not enabled',
      supported: [],
    });

    await expect(promise).resolves.toEqual({
      ok: false,
      error: 'unsupported-list',
      reason: 'kind not enabled',
      supported: [],
    });
  });

  it('posts lists.remove and resolves removed mutation results', async () => {
    const { remove, handleListsMessage } = await import('./shim.js');

    const promise = remove(
      { type: 'mute-list' },
      [{ itemType: 'pubkey', value: 'abc123', visibility: 'private' }],
    );
    const sent = lastPosted('lists.remove');
    expect(sent).toMatchObject({
      id: 'lists-test-1',
      list: { type: 'mute-list' },
      items: [{ itemType: 'pubkey', value: 'abc123', visibility: 'private' }],
    });

    handleListsMessage({
      type: 'lists.remove.result',
      id: sent.id,
      ok: true,
      eventId: 'event-2',
      added: 99,
      removed: 1,
      skipped: 0,
    });

    await expect(promise).resolves.toEqual({
      ok: true,
      eventId: 'event-2',
      removed: 1,
      skipped: 0,
    });
  });

  it('ignores unknown and uncorrelated messages without throwing', async () => {
    const { handleListsMessage } = await import('./shim.js');

    expect(() => handleListsMessage({ type: 'unknown.domain' })).not.toThrow();
    expect(() => handleListsMessage({ type: 'lists.add.result', id: 'no-such-id', ok: true })).not.toThrow();
  });

  it('install cleanup clears pending requests', async () => {
    const { add, installListsShim, handleListsMessage } = await import('./shim.js');

    const cleanup = installListsShim();
    const promise = add({ type: 'mute-list' }, [{ itemType: 'word', value: 'spam' }]);
    const sent = lastPosted('lists.add');
    cleanup();
    handleListsMessage({ type: 'lists.add.result', id: sent.id, ok: true, added: 1 });

    await expect(promise).rejects.toThrow('lists shim uninstalled');
  });
});
