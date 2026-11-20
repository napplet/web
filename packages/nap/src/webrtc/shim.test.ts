import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeShell, type FakeShell } from '../test-support/fake-shell.js';

let shell: FakeShell;
let uuidCounter = 0;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `id-${++uuidCounter}`,
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

describe('webrtc shim', () => {
  it('opens a WebRTC session', async () => {
    const { handleWebrtcMessage, open } = await import('./shim.js');

    const promise = open({
      scope: { type: 'direct', pubkey: 'abc123' },
      channel: 'chat',
      protocol: 'chat:live',
    });
    expect(shell.sent[0]).toEqual({
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
    expect(shell.sent[0]).toEqual({
      type: 'webrtc.send',
      id: 'id-1',
      sessionId: 'sess-1',
      payload: { body: 'hello' },
    });
    handleWebrtcMessage({ type: 'webrtc.send.result', id: 'id-1' });
    await expect(sendPromise).resolves.toBeUndefined();

    const closePromise = close('sess-1', 'done');
    expect(shell.sent[1]).toEqual({
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

  // NAP-WEBRTC (napplet/naps#59 @ fb4dd6f0) examples: "Send and receive bytes 00 01 02 ff".
  it('sends bytes and routes the peer bytes event', async () => {
    const { handleWebrtcMessage, onEvent, sendBytes } = await import('./shim.js');
    const handler = vi.fn();
    onEvent(handler);

    const promise = sendBytes('sess-2', 'AAEC/w==');
    expect(shell.sent[0]).toEqual({ type: 'webrtc.sendBytes', id: 'id-1', sessionId: 'sess-2', bytes: 'AAEC/w==' });
    handleWebrtcMessage({ type: 'webrtc.sendBytes.result', id: 'id-1' });
    await expect(promise).resolves.toBeUndefined();

    const bytesEvent = { type: 'bytes', sessionId: 'sess-2', from: 'abc123', bytes: 'AAEC/w==' };
    const statsEvent = { type: 'stats', sessionId: 'sess-2', pubkey: 'abc123', rttMs: 42, lossRatio: 0.01 };
    handleWebrtcMessage({ type: 'webrtc.event', event: bytesEvent });
    handleWebrtcMessage({ type: 'webrtc.event', event: statsEvent });
    expect(handler).toHaveBeenNthCalledWith(1, bytesEvent);
    expect(handler).toHaveBeenNthCalledWith(2, statsEvent);
  });

  it('rejects sendBytes with the shell error, such as unsupported', async () => {
    const { handleWebrtcMessage, sendBytes } = await import('./shim.js');

    const promise = sendBytes('sess-2', '');
    handleWebrtcMessage({ type: 'webrtc.send.result', id: 'id-1' });
    handleWebrtcMessage({ type: 'webrtc.sendBytes.result', id: 'id-1', error: 'unsupported' });
    await expect(promise).rejects.toThrow('unsupported');
  });

  it('passes requested delivery semantics through and returns the established ones', async () => {
    const { handleWebrtcMessage, open } = await import('./shim.js');
    const request = { scope: { type: 'room' as const, room: 'k3f9...' }, channel: 'state', ordered: false, maxRetransmits: 0 };
    const session = {
      id: 'sess-2',
      scope: { type: 'room' as const, room: 'k3f9...' },
      channel: 'state',
      state: 'connecting' as const,
      ordered: false,
      maxRetransmits: 0,
      maxPayloadBytes: 16384,
    };

    const promise = open(request);
    expect(shell.sent[0]).toEqual({ type: 'webrtc.open', id: 'id-1', request });
    handleWebrtcMessage({ type: 'webrtc.open.result', id: 'id-1', session });
    await expect(promise).resolves.toEqual({ session });
  });
});
