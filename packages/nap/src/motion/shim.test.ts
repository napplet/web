import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MotionSample, MotionState } from './types.js';

const focused: MotionState = { available: true, permission: 'granted', absolute: false, focused: true, frequency: 60 };
// NAP-MOTION Wire Protocol example, including values that the host cannot measure.
const reading: MotionSample = {
  timestamp: 18235.4, interval: 16.7,
  acceleration: { x: 0.1, y: -0.2, z: 0 },
  accelerationIncludingGravity: { x: 0.1, y: -0.2, z: 9.8 },
  rotationRate: { alpha: 1.5, beta: -0.3, gamma: 0 },
  orientation: { alpha: 112.4, beta: 3.1, gamma: -1.2, absolute: false },
};

let post: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules();
  post = vi.fn();
  vi.stubGlobal('window', { parent: { postMessage: post } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('NAP-MOTION cached binding', () => {
  it('correlates requests without secure-context crypto APIs, including after reinstall', async () => {
    vi.stubGlobal('crypto', {});
    const shim = await import('./shim.js');
    const ids = [];
    for (let i = 0; i < 2; i++) {
      const cleanup = shim.installMotionShim();
      const result = shim.requestPermission();
      const { id } = post.mock.calls.at(-1)![0];
      ids.push(id);
      shim.handleMotionMessage({ type: 'motion.permission.result', id, permission: 'denied', absolute: false });
      await expect(result).resolves.toEqual({ permission: 'denied', absolute: false });
      cleanup();
    }
    expect(new Set(ids).size).toBe(2);
  });

  it('starts prompt, subscribes once on first use, and cleans up idempotently', async () => {
    const shim = await import('./shim.js');
    const cleanup = shim.installMotionShim();
    const duplicate = shim.installMotionShim();
    expect(post).not.toHaveBeenCalled();
    expect(shim.state()).toEqual({ available: true, permission: 'prompt', absolute: false, focused: false, frequency: 0 });
    expect(shim.latest()).toBeNull();
    expect(post.mock.calls).toEqual([[{ type: 'motion.subscribe' }, '*']]);
    duplicate();
    cleanup(); cleanup();
    expect(post.mock.calls).toEqual([[{ type: 'motion.subscribe' }, '*'], [{ type: 'motion.unsubscribe' }, '*']]);
  });

  it('subscribes before permission requests and correlates concurrent outcomes without changing state', async () => {
    const shim = await import('./shim.js');
    const cleanup = shim.installMotionShim();
    const relative = shim.requestPermission();
    const absolute = shim.requestPermission(true);
    const relativeMessage = post.mock.calls[1][0];
    const absoluteMessage = post.mock.calls[2][0];
    expect(relativeMessage).toEqual({ type: 'motion.permission', id: expect.any(String) });
    expect(absoluteMessage).toEqual({ type: 'motion.permission', id: expect.any(String), absolute: true });
    expect(relativeMessage.id).not.toBe(absoluteMessage.id);
    shim.handleMotionMessage({ type: 'motion.permission.result', id: absoluteMessage.id, permission: 'granted', absolute: false });
    shim.handleMotionMessage({ type: 'motion.permission.result', id: relativeMessage.id, permission: 'denied', absolute: false });
    await expect(absolute).resolves.toEqual({ permission: 'granted', absolute: false });
    await expect(relative).resolves.toEqual({ permission: 'denied', absolute: false });
    expect(shim.state().permission).toBe('prompt');
    cleanup();
  });

  it('resolves shell errors including prompt and rejects invalid arguments without sending', async () => {
    const shim = await import('./shim.js');
    await expect(shim.requestPermission('true' as unknown as boolean)).rejects.toThrow('boolean');
    expect(post).not.toHaveBeenCalled();
    const promise = shim.requestPermission(false);
    const { id } = post.mock.calls[1][0];
    const resolved = vi.fn();
    void promise.then(resolved);
    for (const reply of [
      { id: 'unknown', permission: 'denied', absolute: false },
      { id, permission: 'prompt', absolute: false },
      { id, permission: 'denied', absolute: true },
      { id, permission: 'granted', absolute: false, error: 1 },
    ]) shim.handleMotionMessage({ type: 'motion.permission.result', ...reply });
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();
    shim.handleMotionMessage({ type: 'motion.permission.result', id, permission: 'prompt', absolute: false, error: 'Sensors unavailable' });
    await expect(promise).resolves.toEqual({ permission: 'prompt', absolute: false, error: 'Sensors unavailable' });
  });

  it('accepts samples only while focused and clears the cache across focus, grant, and availability gaps', async () => {
    const shim = await import('./shim.js');
    const received = vi.fn();
    shim.onSample(received);
    shim.handleMotionMessage({ type: 'motion.sample', ...reading });
    expect(shim.latest()).toBeNull();
    for (const pause of [
      { ...focused, focused: false, frequency: 0 },
      { ...focused, permission: 'denied', focused: false, frequency: 0 },
      { ...focused, available: false, reason: 'blocked', focused: false, frequency: 0 },
    ]) {
      shim.handleMotionMessage({ type: 'motion.state', ...focused });
      expect(shim.latest()).toBeNull();
      shim.handleMotionMessage({ type: 'motion.sample', ...reading });
      expect(shim.latest()).toEqual(reading);
      shim.handleMotionMessage({ type: 'motion.state', ...pause });
      expect(shim.latest()).toBeNull();
      shim.handleMotionMessage({ type: 'motion.sample', ...reading });
    }
    expect(received).toHaveBeenCalledTimes(3);
  });

  it('requires the separate absolute grant and forgets compass readings on revocation', async () => {
    const shim = await import('./shim.js');
    const received = vi.fn();
    shim.onSample(received);
    const compass = { ...reading, orientation: { ...reading.orientation!, absolute: true } };
    shim.handleMotionMessage({ type: 'motion.state', ...focused });
    shim.handleMotionMessage({ type: 'motion.sample', ...compass });
    expect(received).not.toHaveBeenCalled();
    shim.handleMotionMessage({ type: 'motion.state', ...focused, absolute: true });
    shim.handleMotionMessage({ type: 'motion.sample', ...compass });
    expect(shim.latest()).toEqual(compass);
    shim.handleMotionMessage({ type: 'motion.state', ...focused });
    expect(shim.latest()).toBeNull();
  });

  it('isolates nested cache values from inputs, readers, and each listener', async () => {
    const shim = await import('./shim.js');
    shim.onState((value) => { value.focused = false; });
    shim.onSample((value) => { value.acceleration!.x = 99; value.orientation!.alpha = 99; });
    const received = vi.fn();
    shim.onSample(received);
    const input = structuredClone(reading);
    shim.handleMotionMessage({ type: 'motion.state', ...focused });
    shim.handleMotionMessage({ type: 'motion.sample', ...input });
    input.acceleration!.x = 99;
    shim.latest()!.rotationRate!.alpha = 99;
    shim.state().permission = 'denied';
    expect(shim.state()).toEqual(focused);
    expect(shim.latest()).toEqual(reading);
    expect(received).toHaveBeenCalledExactlyOnceWith(reading);
  });

  it('keeps identical callbacks independently closable and isolates throwing listeners', async () => {
    const shim = await import('./shim.js');
    const error = new Error('listener failed');
    const reported = vi.fn();
    vi.stubGlobal('queueMicrotask', reported);
    shim.onSample(() => { throw error; });
    const received = vi.fn();
    const first = shim.onSample(received);
    const second = shim.onSample(received);
    first.close(); first.close();
    shim.handleMotionMessage({ type: 'motion.state', ...focused });
    shim.handleMotionMessage({ type: 'motion.sample', ...reading });
    expect(received).toHaveBeenCalledExactlyOnceWith(reading);
    expect(() => reported.mock.calls[0][0]()).toThrow(error);
    second.close();
    shim.handleMotionMessage({ type: 'motion.sample', ...reading });
    expect(received).toHaveBeenCalledTimes(1);
  });

  it('defers listeners added during delivery and leaves unused installs silent', async () => {
    const shim = await import('./shim.js');
    const cleanup = shim.installMotionShim();
    cleanup();
    expect(post).not.toHaveBeenCalled();
    const later = vi.fn();
    const first = shim.onState(() => { first.close(); shim.onState(later); });
    shim.handleMotionMessage({ type: 'motion.state', ...focused });
    expect(later).not.toHaveBeenCalled();
    shim.handleMotionMessage({ type: 'motion.state', ...focused });
    expect(later).toHaveBeenCalledExactlyOnceWith(focused);
  });

  it('ignores malformed states and samples, including ids on fire-and-forget messages', async () => {
    const shim = await import('./shim.js');
    const stateChanged = vi.fn();
    const sampleChanged = vi.fn();
    shim.onState(stateChanged);
    shim.onSample(sampleChanged);
    for (const patch of [
      { id: 'invalid' }, { permission: 'prompt' }, { frequency: -1 }, { frequency: Infinity },
      { focused: false }, { available: false }, { reason: 'blocked' }, { absolute: 'true' },
    ]) shim.handleMotionMessage({ type: 'motion.state', ...focused, ...patch });
    expect(stateChanged).not.toHaveBeenCalled();
    shim.handleMotionMessage({ type: 'motion.state', ...focused });
    for (const patch of [
      { id: 'invalid' }, { timestamp: NaN }, { interval: -1 }, { acceleration: {} },
      { rotationRate: undefined }, { orientation: { ...reading.orientation, alpha: 361 } },
    ]) shim.handleMotionMessage({ type: 'motion.sample', ...reading, ...patch });
    expect(sampleChanged).not.toHaveBeenCalled();
    const partial = { ...reading, acceleration: { x: null, y: 0, z: null }, orientation: null, rotationRate: null };
    shim.handleMotionMessage({ type: 'motion.sample', ...partial });
    expect(sampleChanged).toHaveBeenCalledExactlyOnceWith(partial);
  });

  it('rejects pending requests on timeout or cleanup, clears listeners and reinstalls fresh', async () => {
    vi.useFakeTimers();
    const shim = await import('./shim.js');
    const cleanup = shim.installMotionShim();
    const timed = expect(shim.requestPermission()).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(30_000);
    await timed;
    const closed = expect(shim.requestPermission()).rejects.toThrow('closed');
    const handler = vi.fn();
    shim.onState(handler);
    cleanup();
    await closed;
    shim.handleMotionMessage({ type: 'motion.state', ...focused });
    expect(handler).not.toHaveBeenCalled();
    const nextCleanup = shim.installMotionShim();
    expect(shim.state().permission).toBe('prompt');
    expect(shim.latest()).toBeNull();
    nextCleanup();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('recovers subscription and pending-request state after transport failure', async () => {
    vi.useFakeTimers();
    const shim = await import('./shim.js');
    post.mockImplementationOnce(() => { throw new Error('send failed'); });
    await expect(shim.requestPermission()).rejects.toThrow('send failed');
    expect(vi.getTimerCount()).toBe(0);
    expect(shim.state().permission).toBe('prompt');
    expect(post.mock.calls.filter(([message]) => message.type === 'motion.subscribe')).toHaveLength(2);
  });
});
