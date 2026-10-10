import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { naddrEncode, npubEncode } from 'nostr-tools/nip19';
interface PostedMessage {
  msg: Record<string, unknown>;
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
    value: { randomUUID: () => `intent-test-${++uuidCounter}` },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      parent: {
        postMessage(msg: Record<string, unknown>, targetOrigin: string) {
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

function lastPosted(type: string): Record<string, unknown> {
  for (let index = postedMessages.length - 1; index >= 0; index -= 1) {
    if (postedMessages[index].msg.type === type) return postedMessages[index].msg;
  }
  throw new Error(`no posted message of type ${type}`);
}


describe('@napplet/nap/intent URI binding', () => {
  it('normalizes query text and accepts a result before delivery', async () => {
    const { invoke, handleIntentMessage } = await import('./shim.js');
    const promise = invoke('napplet:profile/edit?pubkey=abc%20123&marker=a+b&enabled=true');
    const sent = lastPosted('intent.invoke');
    expect(sent.request).toEqual({ archetype: 'profile', action: 'edit', convention: 'napplet:profile/edit', payload: { pubkey: 'abc 123', marker: 'a+b', enabled: 'true' } });
    const result = { ok: true, archetype: 'profile', action: 'edit', convention: 'napplet:profile/edit', handler: 'catalog-profile-viewer' };
    handleIntentMessage({ type: 'intent.invoke.result', id: 'another-request', result });
    handleIntentMessage({ type: 'intent.invoke.result', id: sent.id, result });
    await expect(promise).resolves.toEqual(result);
  });

  it('opens a queryless convention with structured payload and resolves failure values', async () => {
    const { open, handleIntentMessage } = await import('./shim.js');
    const promise = open('napplet:emoji-list/open', { payload: { seed: ['🤙'] }, behavior: { reuse: false } });
    const sent = lastPosted('intent.invoke');
    expect(sent.request).toEqual({ archetype: 'emoji-list', action: 'open', convention: 'napplet:emoji-list/open', payload: { seed: ['🤙'] }, behavior: { reuse: false } });
    handleIntentMessage({ type: 'intent.invoke.result', id: sent.id, result: { ok: false, error: 'no handler' } });
    await expect(promise).resolves.toEqual({ ok: false, error: 'no handler' });
  });

  it('extracts naddr recommendation identity and relays, preserving opaque d values', async () => {
    const { invoke, handleIntentMessage } = await import('./shim.js');
    const pubkey = 'f'.repeat(64);
    const naddr = naddrEncode({ kind: 35129, pubkey, identifier: 'Profile:Viewer', relays: ['wss://relay.example'] });
    const promise = invoke(`napplet:profile/open?pubkey=abc#${naddr}`);
    const sent = lastPosted('intent.invoke');
    expect(sent.request).toEqual({ archetype: 'profile', action: 'open', convention: 'napplet:profile/open', payload: { pubkey: 'abc' }, handlerHint: { address: `35129:${pubkey}:Profile:Viewer`, relays: ['wss://relay.example'] } });
    handleIntentMessage({ type: 'intent.invoke.result', id: sent.id, result: { ok: false, error: 'no handler' } });
    await promise;
  });

  it('supports explicit recommendations and fragment recommendations with structured payload', async () => {
    const { invoke, handleIntentMessage } = await import('./shim.js');
    const pubkey = 'a'.repeat(64);
    const naddr = naddrEncode({ kind: 35129, pubkey, identifier: 'CaseSensitive' });
    for (const [uri, options] of [
      ['napplet:note/open', { handlerHint: { address: `35129:${pubkey}:CaseSensitive` }, payload: { event: 'abc' } }],
      [`napplet:note/open#${naddr}`, { payload: { event: 'abc' } }],
    ] as const) {
      const promise = invoke(uri, options);
      const sent = lastPosted('intent.invoke');
      expect(sent.request).toMatchObject({ payload: { event: 'abc' }, handlerHint: { address: `35129:${pubkey}:CaseSensitive` } });
      handleIntentMessage({ type: 'intent.invoke.result', id: sent.id, result: { ok: false, error: 'no handler' } });
      await promise;
    }
  });

  it('rejects invalid URI forms before emitting traffic', async () => {
    const { invoke, open } = await import('./shim.js');
    const pubkey = 'a'.repeat(64);
    const invalid = [
      'profile', 'napplet:profile/open?pubkey=%ZZ', 'napplet:profile/open?x=1&%78=2',
      'napplet:profile/open#', 'napplet:profile/open#details',
      `napplet:profile/open#nostr:${naddrEncode({ kind: 35129, pubkey, identifier: 'profile' })}`,
      `napplet:profile/open#${npubEncode(pubkey)}`,
      `napplet:profile/open#${naddrEncode({ kind: 30023, pubkey, identifier: 'article' })}`,
      `napplet:profile/open#${naddrEncode({ kind: 35129, pubkey, identifier: '' })}`,
    ];
    for (const uri of invalid) expect(() => invoke(uri)).toThrow();
    expect(() => invoke('napplet:note/open?x=1', { payload: {} })).toThrow();
    expect(() => invoke(`napplet:note/open#${naddrEncode({ kind: 35129, pubkey, identifier: 'note' })}`, { handlerHint: { address: `35129:${pubkey}:other` } })).toThrow();
    expect(() => open('napplet:profile/edit')).toThrow();
    expect(postedMessages).toEqual([]);
  });

  it.each([{ ok: true }, { ok: false }, undefined])('rejects malformed immediate results', async (result) => {
    const { invoke, handleIntentMessage } = await import('./shim.js');
    const promise = invoke('napplet:note/open');
    handleIntentMessage({ type: 'intent.invoke.result', id: lastPosted('intent.invoke').id, result });
    await expect(promise).rejects.toThrow('invalid intent.invoke.result');
  });

  it('retains ordered deliveries until registration, then closes local callbacks', async () => {
    const { handleIntentMessage, onDelivery, installIntentShim } = await import('./shim.js');
    const cleanup = installIntentShim();
    const base = { sender: 'catalog-source', archetype: 'note', action: 'open', convention: 'napplet:note/open' };
    handleIntentMessage({ type: 'intent.deliver', delivery: { ...base, payload: 1 } });
    handleIntentMessage({ type: 'intent.deliver', delivery: { ...base, payload: 2 } });
    const callback = vi.fn();
    const subscription = onDelivery(callback);
    expect(callback.mock.calls.map(([delivery]) => delivery.payload)).toEqual([1, 2]);
    handleIntentMessage({ type: 'intent.deliver', delivery: { ...base, payload: 3 } });
    expect(callback).toHaveBeenCalledTimes(3);
    subscription.close();
    handleIntentMessage({ type: 'intent.deliver', delivery: { ...base, payload: 4 } });
    const next = vi.fn();
    onDelivery(next);
    expect(next).toHaveBeenCalledExactlyOnceWith({ ...base, payload: 4 });
    cleanup();
    expect(postedMessages).toEqual([]);
  });

  it('passes catalog contracts through discovery and availability updates', async () => {
    const { available, handlers, onChanged, handleIntentMessage } = await import('./shim.js');
    const availability = { archetype: 'note', available: true, candidates: [{ id: 'catalog-note', actions: ['open'], conventions: ['napplet:note/open'], contracts: [{ convention: 'napplet:note/open', params: ['event'] }] }], hasDefault: false };
    const query = available('note');
    handleIntentMessage({ type: 'intent.available.result', id: lastPosted('intent.available').id, availability });
    await expect(query).resolves.toEqual(availability);
    const catalog = handlers();
    handleIntentMessage({ type: 'intent.handlers.result', id: lastPosted('intent.handlers').id, handlers: [availability] });
    await expect(catalog).resolves.toEqual([availability]);
    const callback = vi.fn();
    const subscription = onChanged(callback);
    handleIntentMessage({ type: 'intent.changed', availability });
    subscription.close();
    handleIntentMessage({ type: 'intent.changed', availability });
    expect(callback).toHaveBeenCalledExactlyOnceWith(availability);
  });
});
