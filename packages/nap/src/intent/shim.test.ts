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
      randomUUID: () => `intent-test-${++uuidCounter}`,
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

describe('@napplet/nap/intent shim', () => {
  it('posts intent.invoke and resolves with the result', async () => {
    const { invoke, handleIntentMessage } = await import('./shim.js');

    const promise = invoke({ archetype: 'note', action: 'open', protocol: 'NAP-4', payload: { x: 1 } });
    const sent = lastPosted('intent.invoke');
    expect(sent.request).toEqual({ archetype: 'note', action: 'open', protocol: 'NAP-4', payload: { x: 1 } });

    handleIntentMessage({
      type: 'intent.invoke.result',
      id: sent.id,
      result: { ok: true, archetype: 'note', action: 'open', handled: true, handler: 'noteview', windowId: 'win-13', protocol: 'NAP-4' },
    });

    await expect(promise).resolves.toMatchObject({ ok: true, handled: true, handler: 'noteview' });
  });

  it('open() is sugar for an action:"open" invoke carrying opts', async () => {
    const { open, handleIntentMessage } = await import('./shim.js');

    const promise = open('emoji-list', { seed: ['🤙'] }, { behavior: { focus: true } });
    const sent = lastPosted('intent.invoke');
    expect(sent.request).toEqual({ archetype: 'emoji-list', action: 'open', payload: { seed: ['🤙'] }, behavior: { focus: true } });

    handleIntentMessage({
      type: 'intent.invoke.result',
      id: sent.id,
      result: { ok: true, archetype: 'emoji-list', action: 'open', handled: true, handler: 'emojilistr', windowId: 'win-12', protocol: 'NAP-7' },
    });
    await expect(promise).resolves.toMatchObject({ handler: 'emojilistr', protocol: 'NAP-7' });
  });

  it('resolves with ok:false results (no handler) without rejecting', async () => {
    const { invoke, handleIntentMessage } = await import('./shim.js');

    const promise = invoke({ archetype: 'emoji-list', payload: {} });
    const sent = lastPosted('intent.invoke');
    handleIntentMessage({
      type: 'intent.invoke.result',
      id: sent.id,
      result: { ok: false, archetype: 'emoji-list', action: 'open', handled: false, error: 'no handler' },
    });

    await expect(promise).resolves.toMatchObject({ ok: false, handled: false, error: 'no handler' });
  });

  it('rejects on a top-level invoke error', async () => {
    const { invoke, handleIntentMessage } = await import('./shim.js');

    const promise = invoke({ archetype: 'note' });
    const sent = lastPosted('intent.invoke');
    handleIntentMessage({ type: 'intent.invoke.result', id: sent.id, error: 'invoke failed' });

    await expect(promise).rejects.toThrow('invoke failed');
  });

  it('available() posts intent.available and resolves the availability', async () => {
    const { available, handleIntentMessage } = await import('./shim.js');

    const promise = available('emoji-list');
    const sent = lastPosted('intent.available');
    expect(sent.archetype).toBe('emoji-list');

    handleIntentMessage({
      type: 'intent.available.result',
      id: sent.id,
      availability: {
        archetype: 'emoji-list',
        available: true,
        candidates: [{ dTag: 'emojilistr', actions: ['open'], protocols: ['NAP-7'], isDefault: true }],
        hasDefault: true,
      },
    });

    await expect(promise).resolves.toMatchObject({ archetype: 'emoji-list', available: true, hasDefault: true });
  });

  it('handlers() resolves the availability list', async () => {
    const { handlers, handleIntentMessage } = await import('./shim.js');

    const promise = handlers();
    const sent = lastPosted('intent.handlers');
    handleIntentMessage({
      type: 'intent.handlers.result',
      id: sent.id,
      handlers: [{ archetype: 'note', available: true, candidates: [], hasDefault: true }],
    });

    await expect(promise).resolves.toEqual([{ archetype: 'note', available: true, candidates: [], hasDefault: true }]);
  });

  it('onChanged receives intent.changed pushes and stops after close()', async () => {
    const { onChanged, handleIntentMessage } = await import('./shim.js');

    const received: any[] = [];
    const sub = onChanged((a) => received.push(a));

    const availability = { archetype: 'note', available: true, candidates: [], hasDefault: false };
    handleIntentMessage({ type: 'intent.changed', availability });
    expect(received).toHaveLength(1);
    expect(received[0].archetype).toBe('note');

    sub.close();
    handleIntentMessage({ type: 'intent.changed', availability });
    expect(received).toHaveLength(1);
  });

  it('ignores unknown and uncorrelated messages without throwing', async () => {
    const { handleIntentMessage } = await import('./shim.js');

    expect(() => handleIntentMessage({ type: 'unknown.domain' })).not.toThrow();
    expect(() => handleIntentMessage({ type: 'intent.invoke.result', id: 'no-such-id' })).not.toThrow();
    expect(() => handleIntentMessage({ type: 'intent.changed' })).not.toThrow();
  });
});
