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
      randomUUID: () => `media-test-${++uuidCounter}`,
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

describe('@napplet/nap/media shim', () => {
  it('sends ownership-aware create requests and resolves the canonical shell result', async () => {
    const { createSession, handleMediaMessage } = await import('./shim.js');

    const result = createSession({
      owner: 'shell',
      source: { url: 'https://example.com/live.mp3', mimeType: 'audio/mpeg' },
      metadata: { title: 'Live Set' },
      context: {
        label: 'Live queue',
        detail: 'Main stage',
        index: 0,
        total: 1,
        links: [
          {
            rel: 'live-chat',
            title: 'Live chat',
            nostr: { address: '30311:pubkey:d-tag' },
          },
        ],
      },
      capabilities: ['play', 'pause'],
      autoplay: true,
      live: true,
    });

    expect(shell.sent).toEqual([
      {
        type: 'media.session.create',
        id: 'media-test-1',
        owner: 'shell',
        source: { url: 'https://example.com/live.mp3', mimeType: 'audio/mpeg' },
        metadata: { title: 'Live Set' },
        context: {
          label: 'Live queue',
          detail: 'Main stage',
          index: 0,
          total: 1,
          links: [
            {
              rel: 'live-chat',
              title: 'Live chat',
              nostr: { address: '30311:pubkey:d-tag' },
            },
          ],
        },
        capabilities: ['play', 'pause'],
        autoplay: true,
        live: true,
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

    expect(shell.sent).toEqual([
      {
        type: 'media.command',
        sessionId: 'shell-session-7',
        action: 'seek',
        value: 42,
      },
      {
        type: 'media.command',
        sessionId: 'shell-session-7',
        action: 'pause',
      },
    ]);
    expect(shell.windowMessages).toEqual([]);
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

  // NAP-MEDIA (napplet/naps#10 @ 7806f438) §Session retirement and preemption.
  it('delivers destroy retirement to onEnded after the destroy request', async () => {
    const { destroySession, handleMediaMessage, onEnded } = await import('./shim.js');
    const ended = vi.fn();

    onEnded('s1', ended);
    destroySession('s1');
    handleMediaMessage({ type: 'media.session.ended', sessionId: 's1', reason: 'destroyed' });

    expect(shell.sent).toEqual([{ type: 'media.session.destroy', sessionId: 's1' }]);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(ended).toHaveBeenCalledWith({ sessionId: 's1', reason: 'destroyed' });
  });

  it('retires a session once and discards later per-session messages', async () => {
    const { handleMediaMessage, onCapabilities, onCommand, onControls, onEnded, onState } =
      await import('./shim.js');
    const stateSeen = vi.fn();
    const capabilitiesSeen = vi.fn();
    const commandSeen = vi.fn();
    const controlsSeen = vi.fn();
    const ended = vi.fn();

    onState('shell-7', stateSeen);
    onCapabilities('shell-7', capabilitiesSeen);
    onCommand('shell-7', commandSeen);
    onControls('shell-7', controlsSeen);
    onEnded('shell-7', ended);

    handleMediaMessage({ type: 'media.session.ended', sessionId: 'shell-7', reason: 'preempted' });
    handleMediaMessage({ type: 'media.session.ended', sessionId: 'shell-7', reason: 'policy' });
    handleMediaMessage({ type: 'media.state', sessionId: 'shell-7', status: 'playing' });
    handleMediaMessage({ type: 'media.capabilities', sessionId: 'shell-7', actions: ['play'] });
    handleMediaMessage({ type: 'media.command', sessionId: 'shell-7', action: 'play' });
    handleMediaMessage({ type: 'media.controls', sessionId: 'shell-7', controls: ['play'] });

    expect(ended).toHaveBeenCalledTimes(1);
    expect(ended).toHaveBeenCalledWith({ sessionId: 'shell-7', reason: 'preempted' });
    expect(stateSeen).not.toHaveBeenCalled();
    expect(capabilitiesSeen).not.toHaveBeenCalled();
    expect(commandSeen).not.toHaveBeenCalled();
    expect(controlsSeen).not.toHaveBeenCalled();
  });

  it('replays the retained retirement once to a handler registered afterwards', async () => {
    const { handleMediaMessage, onEnded } = await import('./shim.js');
    const late = vi.fn();
    const closedEarly = vi.fn();

    handleMediaMessage({ type: 'media.session.ended', sessionId: 's1', reason: 'destroyed' });
    onEnded('s1', late);
    onEnded('s1', closedEarly).close();
    await Promise.resolve();

    expect(late).toHaveBeenCalledTimes(1);
    expect(late).toHaveBeenCalledWith({ sessionId: 's1', reason: 'destroyed' });
    expect(closedEarly).not.toHaveBeenCalled();
  });

  it('forgets retained retirements when the shim is torn down', async () => {
    const { handleMediaMessage, installMediaShim, onEnded } = await import('./shim.js');
    const cleanup = installMediaShim();
    const late = vi.fn();

    handleMediaMessage({ type: 'media.session.ended', sessionId: 's1', reason: 'destroyed' });
    cleanup();
    onEnded('s1', late);
    await Promise.resolve();

    expect(late).not.toHaveBeenCalled();
  });

  // NAP-MEDIA (napplet/naps#10 @ 7806f438) §Transition reasons.
  it('carries transition reasons on state and commands in both directions', async () => {
    const { handleMediaMessage, onCommand, onState, reportState, sendCommand } = await import('./shim.js');
    const stateSeen = vi.fn();
    const commandSeen = vi.fn();

    onState('shell-7', stateSeen);
    onCommand('s1', commandSeen);
    handleMediaMessage({ type: 'media.state', sessionId: 'shell-7', status: 'stopped', reason: 'ended' });
    handleMediaMessage({ type: 'media.command', sessionId: 's1', action: 'pause', reason: 'focus-lost' });
    reportState('s1', { status: 'paused', reason: 'focus-lost' });
    sendCommand('shell-7', 'play', undefined, 'user');

    expect(stateSeen).toHaveBeenCalledWith({
      status: 'stopped',
      position: undefined,
      duration: undefined,
      volume: undefined,
      reason: 'ended',
    });
    expect(commandSeen).toHaveBeenCalledWith('pause', undefined, 'focus-lost');
    expect(shell.sent).toEqual([
      { type: 'media.state', sessionId: 's1', status: 'paused', reason: 'focus-lost' },
      { type: 'media.command', sessionId: 'shell-7', action: 'play', reason: 'user' },
    ]);
  });
});
