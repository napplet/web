import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface PostedMessage {
  msg: unknown;
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
      randomUUID: () => `media-test-${++uuidCounter}`,
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

describe('@napplet/nub/media shim', () => {
  it('sends ownership-aware create requests and resolves the canonical shell result', async () => {
    const { createSession, handleMediaMessage } = await import('./shim.js');

    const result = createSession({
      owner: 'shell',
      source: { url: 'https://example.com/live.mp3', mimeType: 'audio/mpeg' },
      metadata: { title: 'Live Set' },
      capabilities: ['play', 'pause'],
      autoplay: true,
      live: true,
    });

    expect(postedMessages).toEqual([
      {
        msg: {
          type: 'media.session.create',
          id: 'media-test-1',
          owner: 'shell',
          source: { url: 'https://example.com/live.mp3', mimeType: 'audio/mpeg' },
          metadata: { title: 'Live Set' },
          capabilities: ['play', 'pause'],
          autoplay: true,
          live: true,
        },
        targetOrigin: '*',
      },
    ]);

    handleMediaMessage({
      type: 'media.session.create.result',
      id: 'media-test-1',
      sessionId: 'shell-session-7',
      owner: 'shell',
    });

    await expect(result).resolves.toEqual({
      sessionId: 'shell-session-7',
      owner: 'shell',
    });
  });

  it('resolves create failures as structured media results', async () => {
    const { createSession, handleMediaMessage } = await import('./shim.js');

    const result = createSession({ owner: 'napplet' });

    handleMediaMessage({
      type: 'media.session.create.result',
      id: 'media-test-1',
      error: 'session limit exceeded',
    });

    await expect(result).resolves.toEqual({ error: 'session limit exceeded' });
  });

  it('posts controller commands to the current playback owner', async () => {
    const { sendCommand } = await import('./shim.js');

    sendCommand('shell-session-7', 'seek', 42);
    sendCommand('shell-session-7', 'pause');

    expect(postedMessages).toEqual([
      {
        msg: {
          type: 'media.command',
          sessionId: 'shell-session-7',
          action: 'seek',
          value: 42,
        },
        targetOrigin: '*',
      },
      {
        msg: {
          type: 'media.command',
          sessionId: 'shell-session-7',
          action: 'pause',
        },
        targetOrigin: '*',
      },
    ]);
  });

  it('dispatches shell controls only to handlers for the matching session', async () => {
    const { handleMediaMessage, onControls } = await import('./shim.js');
    const sessionOne = vi.fn();
    const sessionTwo = vi.fn();

    onControls('s1', sessionOne);
    onControls('s2', sessionTwo);

    handleMediaMessage({ type: 'media.controls', sessionId: 's2', controls: ['pause'] });

    expect(sessionOne).not.toHaveBeenCalled();
    expect(sessionTwo).toHaveBeenCalledWith(['pause']);
  });

  it('fans out shell-owned state and capabilities until subscriptions close', async () => {
    const { handleMediaMessage, onCapabilities, onState } = await import('./shim.js');
    const stateSeen = vi.fn();
    const capabilitiesSeen = vi.fn();

    const stateSub = onState('shell-session-7', stateSeen);
    const capabilitiesSub = onCapabilities('shell-session-7', capabilitiesSeen);

    handleMediaMessage({
      type: 'media.state',
      sessionId: 'shell-session-7',
      status: 'playing',
      position: 12,
      duration: 120,
      volume: 0.8,
    });
    handleMediaMessage({
      type: 'media.capabilities',
      sessionId: 'shell-session-7',
      actions: ['pause', 'seek'],
    });

    stateSub.close();
    capabilitiesSub.close();

    handleMediaMessage({
      type: 'media.state',
      sessionId: 'shell-session-7',
      status: 'paused',
    });
    handleMediaMessage({
      type: 'media.capabilities',
      sessionId: 'shell-session-7',
      actions: ['play'],
    });

    expect(stateSeen).toHaveBeenCalledTimes(1);
    expect(stateSeen).toHaveBeenCalledWith({
      status: 'playing',
      position: 12,
      duration: 120,
      volume: 0.8,
    });
    expect(capabilitiesSeen).toHaveBeenCalledTimes(1);
    expect(capabilitiesSeen).toHaveBeenCalledWith(['pause', 'seek']);
  });

  it('clears shell-owned listeners when a session is destroyed', async () => {
    const { destroySession, handleMediaMessage, onCapabilities, onState } = await import('./shim.js');
    const stateSeen = vi.fn();
    const capabilitiesSeen = vi.fn();

    onState('shell-session-7', stateSeen);
    onCapabilities('shell-session-7', capabilitiesSeen);

    destroySession('shell-session-7');
    handleMediaMessage({
      type: 'media.state',
      sessionId: 'shell-session-7',
      status: 'playing',
    });
    handleMediaMessage({
      type: 'media.capabilities',
      sessionId: 'shell-session-7',
      actions: ['pause'],
    });

    expect(stateSeen).not.toHaveBeenCalled();
    expect(capabilitiesSeen).not.toHaveBeenCalled();
  });
});
