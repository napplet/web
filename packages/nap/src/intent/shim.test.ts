import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  IntentCandidate as CoreIntentCandidate,
  IntentContract as CoreIntentContract,
  IntentDelivery as CoreIntentDelivery,
  IntentRequest as CoreIntentRequest,
  IntentResult as CoreIntentResult,
} from '@napplet/core';
import type {
  IntentCandidate,
  IntentContract,
  IntentDelivery,
  IntentRequest,
  IntentResult,
} from './types.js';

const coreConventionRequest: CoreIntentRequest = {
  archetype: 'note',
  action: 'open',
  convention: 'napplet:note/open',
  payload: { target: { type: 'event', id: 'abc' } },
};
const napConventionRequest: IntentRequest = coreConventionRequest;

const coreConventionResult: CoreIntentResult = {
  ok: true,
  archetype: 'note',
  action: 'open',
  convention: 'napplet:note/open',
  handler: 'noteview',
};
const napConventionResult: IntentResult = coreConventionResult;

const coreConventionContract: CoreIntentContract = {
  convention: 'napplet:note/open',
  eventKinds: [1],
};
const napConventionContract: IntentContract = coreConventionContract;

const coreConventionCandidate: CoreIntentCandidate = {
  dTag: 'noteview',
  actions: ['open'],
  conventions: ['napplet:note/open'],
  contracts: [coreConventionContract],
};
const napConventionCandidate: IntentCandidate = coreConventionCandidate;

const coreDelivery: CoreIntentDelivery = {
  sender: 'runtime-attested-source',
  archetype: 'note',
  action: 'open',
  convention: 'napplet:note/open',
};
const napDelivery: IntentDelivery = coreDelivery;

void napConventionRequest;
void napConventionResult;
void napConventionContract;
void napConventionCandidate;
void napDelivery;

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
  it('derives identity and text payload from the authoritative URI before invoking', async () => {
    const { invoke, handleIntentMessage } = await import('./shim.js');

    const promise = invoke('napplet:profile/open?pubkey=abc%20123&marker=a+b', {
      handler: 'profile-viewer',
      behavior: { focus: true },
    });
    const sent = lastPosted('intent.invoke');
    expect(sent.request).toEqual({
      archetype: 'profile',
      action: 'open',
      convention: 'napplet:profile/open',
      payload: { pubkey: 'abc 123', marker: 'a+b' },
      handler: 'profile-viewer',
      behavior: { focus: true },
    });
    expect(sent.request).not.toHaveProperty('sender');

    handleIntentMessage({
      type: 'intent.invoke.result',
      id: sent.id,
      result: {
        ok: true,
        archetype: 'profile',
        action: 'open',
        convention: 'napplet:profile/open',
        handler: 'profile-viewer',
      },
    });

    await expect(promise).resolves.toEqual({
      ok: true,
      archetype: 'profile',
      action: 'open',
      convention: 'napplet:profile/open',
      handler: 'profile-viewer',
    });
  });

  it('uses a URI-shaped open request and resolves acceptance without delivery state', async () => {
    const { open, handleIntentMessage } = await import('./shim.js');

    const payload = { seed: ['🤙'], source: 'palette' };
    const promise = open('napplet:emoji-list/open', {
      payload,
      behavior: { focus: true },
    });
    const sent = lastPosted('intent.invoke');
    expect(sent.request).toEqual({
      archetype: 'emoji-list',
      action: 'open',
      convention: 'napplet:emoji-list/open',
      payload,
      behavior: { focus: true },
    });

    handleIntentMessage({
      type: 'intent.invoke.result',
      id: sent.id,
      result: {
        ok: true,
        archetype: 'emoji-list',
        action: 'open',
        convention: 'napplet:emoji-list/open',
        handler: 'emojilistr',
      },
    });
    await expect(promise).resolves.toEqual({
      ok: true,
      archetype: 'emoji-list',
      action: 'open',
      convention: 'napplet:emoji-list/open',
      handler: 'emojilistr',
    });
  });

  it('rejects invalid URI inputs and caller-supplied identity without posting', async () => {
    const { invoke, open } = await import('./shim.js');

    expect(() => open('napplet:profile/edit')).toThrow();
    expect(() => invoke('napplet:profile/open?pubkey=abc123', { payload: {} })).toThrow();
    expect(() => invoke('napplet:profile/open#details')).toThrow();
    expect(() => invoke('napplet:profile/open', {
      archetype: 'note',
    } as never)).toThrow();
    expect(() => invoke('napplet:profile/open', {
      sender: 'forged-source',
    } as never)).toThrow();
    expect(postedMessages).toEqual([]);
  });

  it('resolves an ok:false pre-acceptance result without rejecting', async () => {
    const { invoke, handleIntentMessage } = await import('./shim.js');

    const promise = invoke('napplet:emoji-list/open');
    const sent = lastPosted('intent.invoke');
    handleIntentMessage({
      type: 'intent.invoke.result',
      id: sent.id,
      result: { ok: false, error: 'no handler' },
    });

    await expect(promise).resolves.toEqual({ ok: false, error: 'no handler' });
  });

  it('rejects a top-level invoke error before acceptance', async () => {
    const { invoke, handleIntentMessage } = await import('./shim.js');

    const promise = invoke('napplet:note/open');
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
        candidates: [
          {
            dTag: 'emojilistr',
            actions: ['open'],
            conventions: ['napplet:emoji-list/open'],
            contracts: [{ convention: 'napplet:emoji-list/open' }],
            isDefault: true,
          },
        ],
        hasDefault: true,
      },
    });

    await expect(promise).resolves.toMatchObject({
      archetype: 'emoji-list',
      available: true,
      candidates: [{ conventions: ['napplet:emoji-list/open'] }],
      hasDefault: true,
    });
  });

  it('handlers() resolves the availability list', async () => {
    const { handlers, handleIntentMessage } = await import('./shim.js');

    const promise = handlers();
    const sent = lastPosted('intent.handlers');
    handleIntentMessage({
      type: 'intent.handlers.result',
      id: sent.id,
      handlers: [
        {
          archetype: 'note',
          available: true,
          candidates: [
            {
              dTag: 'noteview',
              actions: ['open'],
              conventions: ['napplet:note/open'],
              contracts: [{ convention: 'napplet:note/open' }],
            },
          ],
          hasDefault: true,
        },
      ],
    });

    await expect(promise).resolves.toEqual([
      {
        archetype: 'note',
        available: true,
        candidates: [
          {
            dTag: 'noteview',
            actions: ['open'],
            conventions: ['napplet:note/open'],
            contracts: [{ convention: 'napplet:note/open' }],
          },
        ],
        hasDefault: true,
      },
    ]);
  });

  it('onChanged receives intent.changed pushes and stops after close()', async () => {
    const { onChanged, handleIntentMessage } = await import('./shim.js');

    const received: any[] = [];
    const sub = onChanged((availability) => received.push(availability));

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
