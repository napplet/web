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
      randomUUID: () => `outbox-test-${++uuidCounter}`,
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

const EV = {
  id: 'ev1',
  pubkey: 'ab12',
  created_at: 1234567890,
  kind: 1,
  tags: [],
  content: 'hello',
  sig: 'sig',
};

const RESULT = {
  event: EV,
  sidecar: { relayHints: ['wss://relay.example.com'] },
};

describe('@napplet/nap/outbox shim', () => {
  it('posts outbox.getEvent and resolves with the event result', async () => {
    const { getEvent, handleOutboxMessage } = await import('./shim.js');

    const promise = getEvent('ev1', { author: 'ab12', timeoutMs: 3000 });
    const sent = lastPosted('outbox.getEvent');
    expect(sent).toEqual({
      type: 'outbox.getEvent',
      id: 'outbox-test-1',
      eventId: 'ev1',
      options: { author: 'ab12', timeoutMs: 3000 },
    });

    handleOutboxMessage({
      type: 'outbox.getEvent.result',
      id: sent.id,
      result: RESULT,
    });

    await expect(promise).resolves.toEqual({
      result: RESULT,
    });
  });

  it('carries incomplete and inline error through getEvent results without rejecting', async () => {
    const { getEvent, handleOutboxMessage } = await import('./shim.js');

    const promise = getEvent('missing-event');
    const sent = lastPosted('outbox.getEvent');
    handleOutboxMessage({
      type: 'outbox.getEvent.result',
      id: sent.id,
      incomplete: true,
      error: 'not found',
    });

    await expect(promise).resolves.toEqual({
      incomplete: true,
      error: 'not found',
    });
  });

  it('posts outbox.query and resolves with the deduplicated result', async () => {
    const { query, handleOutboxMessage } = await import('./shim.js');

    const promise = query([{ authors: ['ab12'], kinds: [1] }], {
      authors: ['ab12'],
      timeoutMs: 3000,
    });
    const sent = lastPosted('outbox.query');
    expect(sent.filters).toEqual([{ authors: ['ab12'], kinds: [1] }]);
    expect(sent.options).toEqual({ authors: ['ab12'], timeoutMs: 3000 });

    handleOutboxMessage({
      type: 'outbox.query.result',
      id: sent.id,
      events: [RESULT],
    });

    await expect(promise).resolves.toEqual({
      events: [RESULT],
    });
  });

  it('carries incomplete and inline error through query results without rejecting', async () => {
    const { query, handleOutboxMessage } = await import('./shim.js');

    const promise = query([{ kinds: [1] }]);
    const sent = lastPosted('outbox.query');
    handleOutboxMessage({
      type: 'outbox.query.result',
      id: sent.id,
      events: [],
      incomplete: true,
      error: 'relay timeout',
    });

    await expect(promise).resolves.toEqual({
      events: [],
      incomplete: true,
      error: 'relay timeout',
    });
  });

  it('subscribe streams event results to on() listeners and drops state on closed', async () => {
    const { subscribe, handleOutboxMessage } = await import('./shim.js');

    const events: unknown[] = [];
    let closedReason: string | undefined | null = null;

    const sub = subscribe([{ kinds: [1] }], { timeoutMs: 3000 });
    sub.on('event', (result) => events.push(result));
    sub.on('closed', (reason) => { closedReason = reason ?? undefined; });

    const sent = lastPosted('outbox.subscribe');
    expect(sent.subId).toBeDefined();
    expect(sent.options).toEqual({ timeoutMs: 3000 });

    handleOutboxMessage({ type: 'outbox.event', subId: sent.subId, result: RESULT });
    expect(events).toEqual([RESULT]);

    handleOutboxMessage({ type: 'outbox.closed', subId: sent.subId, reason: 'upstream gone' });
    expect(closedReason).toBe('upstream gone');

    // After closed, further events are dropped (subscription state cleared).
    handleOutboxMessage({ type: 'outbox.event', subId: sent.subId, result: RESULT });
    expect(events).toHaveLength(1);
  });

  it('subscribe close() posts outbox.close and stops delivering events', async () => {
    const { subscribe, handleOutboxMessage } = await import('./shim.js');

    const events: unknown[] = [];
    const sub = subscribe([{ kinds: [1] }]);
    sub.on('event', (event) => events.push(event));
    const sent = lastPosted('outbox.subscribe');

    sub.close();
    const closeMsg = lastPosted('outbox.close');
    expect(closeMsg.subId).toBe(sent.subId);

    handleOutboxMessage({ type: 'outbox.event', subId: sent.subId, result: RESULT });
    expect(events).toHaveLength(0);
  });

  it('posts outbox.publish and resolves with the publish result', async () => {
    const { publish, handleOutboxMessage } = await import('./shim.js');

    const promise = publish({ kind: 1, content: 'hi', tags: [], created_at: 1 }, {
      targetAuthors: ['ab12'],
    });
    const sent = lastPosted('outbox.publish');
    expect(sent.event).toEqual({ kind: 1, content: 'hi', tags: [], created_at: 1 });
    expect(sent.options).toEqual({ targetAuthors: ['ab12'] });

    handleOutboxMessage({
      type: 'outbox.publish.result',
      id: sent.id,
      ok: true,
      event: EV,
      eventId: 'ev1',
      relays: { 'wss://r.example': true },
    });

    await expect(promise).resolves.toEqual({
      ok: true,
      event: EV,
      eventId: 'ev1',
      relays: { 'wss://r.example': true },
    });
  });

  it('resolveRelays resolves with the plan and rejects on error', async () => {
    const { resolveRelays, handleOutboxMessage } = await import('./shim.js');

    const okPromise = resolveRelays({ pubkey: 'ab12', direction: 'read' });
    const sent1 = lastPosted('outbox.resolveRelays');
    expect(sent1.target).toEqual({ pubkey: 'ab12', direction: 'read' });
    handleOutboxMessage({
      type: 'outbox.resolveRelays.result',
      id: sent1.id,
      plan: { relays: ['wss://r.example'], source: 'nip65' },
    });
    await expect(okPromise).resolves.toEqual({ relays: ['wss://r.example'], source: 'nip65' });

    const errPromise = resolveRelays({ authors: [] });
    const sent2 = lastPosted('outbox.resolveRelays');
    handleOutboxMessage({ type: 'outbox.resolveRelays.result', id: sent2.id, plan: { relays: [], source: 'fallback' }, error: 'no authors' });
    await expect(errPromise).rejects.toThrow('no authors');
  });

  it('ignores unknown and uncorrelated messages without throwing', async () => {
    const { handleOutboxMessage } = await import('./shim.js');

    expect(() => handleOutboxMessage({ type: 'unknown.domain' })).not.toThrow();
    expect(() => handleOutboxMessage({ type: 'outbox.query.result', id: 'no-such-id' })).not.toThrow();
    expect(() => handleOutboxMessage({ type: 'outbox.event', subId: 'no-such-sub' })).not.toThrow();
  });
});
