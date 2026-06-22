import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posted: Array<Record<string, unknown>> = [];
let uuidCounter = 0;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  posted.length = 0;
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `id-${++uuidCounter}`,
    },
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      parent: {
        postMessage(msg: Record<string, unknown>) {
          posted.push(msg);
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

describe('webrtc shim', () => {
  it('opens a WebRTC session', async () => {
    const { handleWebrtcMessage, open } = await import('./shim.js');

    const promise = open({
      scope: { type: 'direct', pubkey: 'abc123' },
      channel: 'chat',
      protocol: 'chat:live',
    });
    expect(posted[0]).toEqual({
      type: 'webrtc.open',
      id: 'id-1',
      request: {
        scope: { type: 'direct', pubkey: 'abc123' },
        channel: 'chat',
        protocol: 'chat:live',
      },
    });

    handleWebrtcMessage({
      type: 'webrtc.open.result',
      id: 'id-1',
      session: {
        id: 'sess-1',
        scope: { type: 'direct', pubkey: 'abc123' },
        channel: 'chat',
        protocol: 'chat:live',
        state: 'connecting',
      },
    });

    await expect(promise).resolves.toEqual({
      session: {
        id: 'sess-1',
        scope: { type: 'direct', pubkey: 'abc123' },
        channel: 'chat',
        protocol: 'chat:live',
        state: 'connecting',
      },
    });
  });

  it('sends and closes sessions', async () => {
    const { close, handleWebrtcMessage, send } = await import('./shim.js');

    const sendPromise = send('sess-1', { body: 'hello' });
    expect(posted[0]).toEqual({
      type: 'webrtc.send',
      id: 'id-1',
      sessionId: 'sess-1',
      payload: { body: 'hello' },
    });
    handleWebrtcMessage({ type: 'webrtc.send.result', id: 'id-1' });
    await expect(sendPromise).resolves.toBeUndefined();

    const closePromise = close('sess-1', 'done');
    expect(posted[1]).toEqual({
      type: 'webrtc.close',
      id: 'id-2',
      sessionId: 'sess-1',
      reason: 'done',
    });
    handleWebrtcMessage({ type: 'webrtc.close.result', id: 'id-2' });
    await expect(closePromise).resolves.toBeUndefined();
  });

  it('rejects result errors', async () => {
    const { handleWebrtcMessage, send } = await import('./shim.js');

    const promise = send('missing', { body: 'hello' });
    handleWebrtcMessage({ type: 'webrtc.send.result', id: 'id-1', error: 'session not found' });
    await expect(promise).rejects.toThrow('session not found');
  });

  it('routes webrtc.event pushes to subscribers', async () => {
    const { handleWebrtcMessage, onEvent } = await import('./shim.js');

    const handler = vi.fn();
    const sub = onEvent(handler);
    handleWebrtcMessage({
      type: 'webrtc.event',
      event: { type: 'message', sessionId: 'sess-1', from: 'abc123', payload: { body: 'hi' } },
    });
    expect(handler).toHaveBeenCalledWith({
      type: 'message',
      sessionId: 'sess-1',
      from: 'abc123',
      payload: { body: 'hi' },
    });

    sub.close();
    handleWebrtcMessage({ type: 'webrtc.event', event: { type: 'closed', sessionId: 'sess-1' } });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
