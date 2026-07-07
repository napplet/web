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
      randomUUID: () => `common-test-${++uuidCounter}`,
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

describe('@napplet/nap/common shim', () => {
  it('posts common.encodeNip19 and resolves with nip19Type', async () => {
    const { encodeNip19, handleCommonMessage } = await import('./shim.js');

    const promise = encodeNip19({ type: 'npub', hex: 'f'.repeat(64) });
    const sent = lastPosted('common.encodeNip19');
    expect(sent.input).toEqual({ type: 'npub', hex: 'f'.repeat(64) });

    handleCommonMessage({
      type: 'common.encodeNip19.result',
      id: sent.id,
      ok: true,
      value: 'npub1example',
      nip19Type: 'npub',
    });

    await expect(promise).resolves.toEqual({ ok: true, value: 'npub1example', nip19Type: 'npub' });
  });

  it('posts common.decodeNip19 and resolves normalized fields', async () => {
    const { decodeNip19, handleCommonMessage } = await import('./shim.js');

    const promise = decodeNip19('nprofile1example');
    const sent = lastPosted('common.decodeNip19');
    expect(sent.value).toBe('nprofile1example');

    handleCommonMessage({
      type: 'common.decodeNip19.result',
      id: sent.id,
      ok: true,
      nip19Type: 'nprofile',
      pubkey: 'e'.repeat(64),
      relays: ['wss://relay.example'],
    });

    await expect(promise).resolves.toEqual({
      ok: true,
      nip19Type: 'nprofile',
      pubkey: 'e'.repeat(64),
      relays: ['wss://relay.example'],
    });
  });

  it('posts common.getProfile and resolves profile data', async () => {
    const { getProfile, handleCommonMessage } = await import('./shim.js');

    const promise = getProfile('npub1example');
    const sent = lastPosted('common.getProfile');
    expect(sent.target).toBe('npub1example');

    handleCommonMessage({
      type: 'common.getProfile.result',
      id: sent.id,
      ok: true,
      pubkey: 'd'.repeat(64),
      profile: { name: 'alice' },
      result: {
        event: {
          id: '0'.repeat(64),
          pubkey: 'd'.repeat(64),
          created_at: 1234567890,
          kind: 0,
          tags: [],
          content: '{"name":"alice"}',
          sig: 'f'.repeat(128),
        },
        sidecar: { relayHints: ['wss://relay.example'] },
      },
    });

    await expect(promise).resolves.toMatchObject({
      ok: true,
      pubkey: 'd'.repeat(64),
      profile: { name: 'alice' },
      result: { sidecar: { relayHints: ['wss://relay.example'] } },
    });
  });

  it('posts common.follows and resolves hex pubkeys', async () => {
    const { follows, handleCommonMessage } = await import('./shim.js');

    const promise = follows();
    const sent = lastPosted('common.follows');

    handleCommonMessage({
      type: 'common.follows.result',
      id: sent.id,
      ok: true,
      pubkeys: ['a'.repeat(64), 'b'.repeat(64)],
    });

    await expect(promise).resolves.toEqual({ ok: true, pubkeys: ['a'.repeat(64), 'b'.repeat(64)] });
  });

  it('posts common.follow and common.unfollow with pubkeys arrays', async () => {
    const { follow, unfollow, handleCommonMessage } = await import('./shim.js');

    const followPromise = follow('npub1one', 'npub1two');
    const followSent = lastPosted('common.follow');
    expect(followSent.pubkeys).toEqual(['npub1one', 'npub1two']);
    handleCommonMessage({ type: 'common.follow.result', id: followSent.id, ok: true, eventId: '1'.repeat(64) });
    await expect(followPromise).resolves.toEqual({ ok: true, eventId: '1'.repeat(64) });

    const unfollowPromise = unfollow('npub1two');
    const unfollowSent = lastPosted('common.unfollow');
    expect(unfollowSent.pubkeys).toEqual(['npub1two']);
    handleCommonMessage({ type: 'common.unfollow.result', id: unfollowSent.id, ok: false, error: 'cancelled' });
    await expect(unfollowPromise).resolves.toEqual({ ok: false, error: 'cancelled' });
  });

  it('posts common.react with the optional custom emoji href', async () => {
    const { react, handleCommonMessage } = await import('./shim.js');

    const promise = react('7'.repeat(64), ':blob:', 'https://emoji.example/blob.png');
    const sent = lastPosted('common.react');
    expect(sent).toMatchObject({
      targetEventId: '7'.repeat(64),
      reaction: ':blob:',
      customEmojiHref: 'https://emoji.example/blob.png',
    });

    handleCommonMessage({ type: 'common.react.result', id: sent.id, ok: true, eventId: '8'.repeat(64) });
    await expect(promise).resolves.toEqual({ ok: true, eventId: '8'.repeat(64) });
  });

  it('posts common.report with target, reason, and text', async () => {
    const { report, handleCommonMessage } = await import('./shim.js');

    const target = { type: 'event' as const, id: '9'.repeat(64), relay: 'wss://relay.example' };
    const promise = report(target, 'spam', 'repeated unsolicited posts');
    const sent = lastPosted('common.report');
    expect(sent).toMatchObject({ target, reason: 'spam', text: 'repeated unsolicited posts' });

    handleCommonMessage({ type: 'common.report.result', id: sent.id, ok: true, eventId: 'a'.repeat(64) });
    await expect(promise).resolves.toEqual({ ok: true, eventId: 'a'.repeat(64) });
  });

  it('rejects malformed top-level result errors', async () => {
    const { encodeNip19, handleCommonMessage } = await import('./shim.js');

    const promise = encodeNip19({ type: 'note', hex: '1'.repeat(64) });
    const sent = lastPosted('common.encodeNip19');
    handleCommonMessage({ type: 'common.encodeNip19.result', id: sent.id, error: 'unsupported value' });

    await expect(promise).rejects.toThrow('unsupported value');
  });

  it('ignores unknown and uncorrelated messages without throwing', async () => {
    const { handleCommonMessage } = await import('./shim.js');

    expect(() => handleCommonMessage({ type: 'unknown.domain' })).not.toThrow();
    expect(() => handleCommonMessage({ type: 'common.react.result', id: 'no-such-id' })).not.toThrow();
  });
});
