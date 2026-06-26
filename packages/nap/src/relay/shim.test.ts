import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface PostedMessage {
  msg: any;
  targetOrigin: string;
}

let postedMessages: PostedMessage[];
let messageListener: ((event: { source: unknown; data: unknown }) => void) | null;
let uuidCounter: number;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  postedMessages = [];
  messageListener = null;
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `relay-test-${++uuidCounter}`,
    },
  });

  const parent = {
    postMessage(msg: unknown, targetOrigin: string) {
      postedMessages.push({ msg, targetOrigin });
    },
  };

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      parent,
      addEventListener(type: string, listener: (event: { source: unknown; data: unknown }) => void) {
        if (type === 'message') messageListener = listener;
      },
      removeEventListener(type: string, listener: (event: { source: unknown; data: unknown }) => void) {
        if (type === 'message' && messageListener === listener) messageListener = null;
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

function lastPosted(type: string): any {
  for (let i = postedMessages.length - 1; i >= 0; i--) {
    if (postedMessages[i].msg?.type === type) return postedMessages[i].msg;
  }
  throw new Error(`no posted message of type ${type}`);
}

function emitFromParent(data: unknown): void {
  if (!messageListener) throw new Error('no message listener registered');
  messageListener({ source: window.parent, data });
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
