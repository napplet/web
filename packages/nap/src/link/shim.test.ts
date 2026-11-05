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
      randomUUID: () => `link-test-${++uuidCounter}`,
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

/** Find the most recent posted message of a given type. */
function lastPosted(type: string): any {
  for (let i = shell.sent.length - 1; i >= 0; i--) {
    if (shell.sent[i]?.type === type) return shell.sent[i];
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
