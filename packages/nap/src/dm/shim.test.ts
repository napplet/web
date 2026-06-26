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
      randomUUID: () => `dm-test-${++uuidCounter}`,
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

function lastPosted(type: string): any {
  for (let i = postedMessages.length - 1; i >= 0; i--) {
    if (postedMessages[i].msg?.type === type) return postedMessages[i].msg;
  }
  throw new Error(`no posted message of type ${type}`);
}

const MESSAGE = {
  id: 'msg1',
  conversationId: 'c1',
  senderPubkey: 'ab12',
  createdAt: 1790337600,
  content: 'hello',
  status: 'sent' as const,
};

const CONVERSATION = {
  id: 'c1',
  kind: 'direct' as const,
  participants: [{ pubkey: 'ab12', label: 'Alice' }],
  unread: 0,
  updatedAt: 1790337600,
};

describe('@napplet/nap/dm shim', () => {
  it('posts dm.status and resolves the top-level status payload', async () => {
    const { status, handleDmMessage } = await import('./shim.js');

    const promise = status();
    const sent = lastPosted('dm.status');
    expect(sent).toEqual({ type: 'dm.status', id: 'dm-test-1' });

    handleDmMessage({
      type: 'dm.status.result',
      id: sent.id,
      available: true,
      ownerPubkey: 'ab12',
      implementations: ['nip17'],
      capabilities: ['direct'],
    });

    await expect(promise).resolves.toEqual({
      available: true,
      ownerPubkey: 'ab12',
      implementations: ['nip17'],
      capabilities: ['direct'],
    });
  });

  it('posts conversation and message history requests with query fields', async () => {
    const { conversations, messages, handleDmMessage } = await import('./shim.js');

    const conversationsPromise = conversations({ cursor: 'cur1', limit: 10 });
    const conversationsRequest = lastPosted('dm.conversations');
    expect(conversationsRequest).toEqual({
      type: 'dm.conversations',
      id: conversationsRequest.id,
      cursor: 'cur1',
      limit: 10,
    });
    handleDmMessage({
      type: 'dm.conversations.result',
      id: conversationsRequest.id,
      conversations: [CONVERSATION],
      cursor: 'cur2',
    });
    await expect(conversationsPromise).resolves.toEqual({
      conversations: [CONVERSATION],
      cursor: 'cur2',
    });

    const messagesPromise = messages({ conversationId: 'c1', limit: 50 });
    const messagesRequest = lastPosted('dm.messages');
    expect(messagesRequest).toEqual({
      type: 'dm.messages',
      id: messagesRequest.id,
      conversationId: 'c1',
      limit: 50,
    });
    handleDmMessage({
      type: 'dm.messages.result',
      id: messagesRequest.id,
      messages: [MESSAGE],
    });
    await expect(messagesPromise).resolves.toEqual({ messages: [MESSAGE] });
  });

  it('posts dm.send and resolves the send result', async () => {
    const { send, handleDmMessage } = await import('./shim.js');

    const promise = send({
      recipients: ['ab12'],
      content: 'hello',
      clientMessageId: 'client-1',
    });
    const sent = lastPosted('dm.send');
    expect(sent).toEqual({
      type: 'dm.send',
      id: sent.id,
      recipients: ['ab12'],
      content: 'hello',
      clientMessageId: 'client-1',
    });

    handleDmMessage({
      type: 'dm.send.result',
      id: sent.id,
      ok: true,
      message: MESSAGE,
    });

    await expect(promise).resolves.toEqual({ ok: true, message: MESSAGE });
  });

  it('subscribes, receives dm.message pushes, and unsubscribes', async () => {
    const { subscribe, unsubscribe, onMessage, handleDmMessage } = await import('./shim.js');

    const received: Array<{ message: unknown; subscriptionId: string }> = [];
    const listener = onMessage((message, subscriptionId) => {
      received.push({ message, subscriptionId });
    });

    const subscribePromise = subscribe({ conversationId: 'c1' });
    const subscribeRequest = lastPosted('dm.subscribe');
    expect(subscribeRequest).toEqual({
      type: 'dm.subscribe',
      id: subscribeRequest.id,
      conversationId: 'c1',
    });
    handleDmMessage({
      type: 'dm.subscribe.result',
      id: subscribeRequest.id,
      subscriptionId: 'live1',
    });
    await expect(subscribePromise).resolves.toEqual({ subscriptionId: 'live1' });

    handleDmMessage({ type: 'dm.message', subscriptionId: 'live1', message: MESSAGE });
    expect(received).toEqual([{ message: MESSAGE, subscriptionId: 'live1' }]);

    listener.close();
    handleDmMessage({ type: 'dm.message', subscriptionId: 'live1', message: MESSAGE });
    expect(received).toHaveLength(1);

    const unsubscribePromise = unsubscribe('live1');
    const unsubscribeRequest = lastPosted('dm.unsubscribe');
    expect(unsubscribeRequest).toEqual({
      type: 'dm.unsubscribe',
      id: unsubscribeRequest.id,
      subscriptionId: 'live1',
    });
    handleDmMessage({
      type: 'dm.unsubscribe.result',
      id: unsubscribeRequest.id,
      ok: true,
    });
    await expect(unsubscribePromise).resolves.toEqual({ ok: true });
  });

  it('rejects top-level result errors and ignores uncorrelated messages', async () => {
    const { send, handleDmMessage } = await import('./shim.js');

    const promise = send({ recipients: ['ab12'], content: 'hello' });
    const sent = lastPosted('dm.send');
    expect(() => handleDmMessage({ type: 'dm.send.result', id: 'no-such-id', error: 'ignored' })).not.toThrow();
    handleDmMessage({ type: 'dm.send.result', id: sent.id, error: 'send failed' });

    await expect(promise).rejects.toThrow('send failed');
    expect(() => handleDmMessage({ type: 'unknown.domain' })).not.toThrow();
    expect(() => handleDmMessage({ type: 'dm.message' })).not.toThrow();
  });
});
