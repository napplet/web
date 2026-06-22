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
      randomUUID: () => `link-test-${++uuidCounter}`,
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

describe('@napplet/nap/link shim', () => {
  it('posts link.open and resolves opened results', async () => {
    const { open, handleLinkMessage } = await import('./shim.js');

    const promise = open('https://example.com/post/123', { label: 'Read post' });
    const sent = lastPosted('link.open');
    expect(sent).toMatchObject({
      id: 'link-test-1',
      url: 'https://example.com/post/123',
      options: { label: 'Read post' },
    });

    handleLinkMessage({ type: 'link.open.result', id: sent.id, status: 'opened' });

    await expect(promise).resolves.toEqual({ status: 'opened' });
  });

  it('resolves denied results without rejecting', async () => {
    const { open, handleLinkMessage } = await import('./shim.js');

    const promise = open('file:///etc/passwd');
    const sent = lastPosted('link.open');
    handleLinkMessage({
      type: 'link.open.result',
      id: sent.id,
      status: 'denied',
      error: 'unsupported-scheme',
    });

    await expect(promise).resolves.toEqual({ status: 'denied' });
  });

  it('ignores unknown and uncorrelated messages without throwing', async () => {
    const { handleLinkMessage } = await import('./shim.js');

    expect(() => handleLinkMessage({ type: 'unknown.domain' })).not.toThrow();
    expect(() => handleLinkMessage({ type: 'link.open.result', id: 'no-such-id', status: 'opened' })).not.toThrow();
  });

  it('install cleanup clears pending requests', async () => {
    const { open, installLinkShim, handleLinkMessage } = await import('./shim.js');

    const cleanup = installLinkShim();
    const promise = open('https://example.com/');
    const sent = lastPosted('link.open');
    cleanup();
    handleLinkMessage({ type: 'link.open.result', id: sent.id, status: 'opened' });

    await expect(promise).rejects.toThrow('link shim uninstalled');
  });
});
