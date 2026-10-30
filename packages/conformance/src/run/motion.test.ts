// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MotionApi } from '@napplet/core';
import { createMotionStateTools } from '@napplet/nap/motion';
import { bootAndCollect, runtimePrelude } from './boot.js';
import { MOTION_STATE_TOOLS_SOURCE } from './motion-prelude.js';

const initial = { available: true, permission: 'prompt', absolute: false, focused: false, frequency: 0 } as const;
const focused = { ...initial, permission: 'granted', focused: true, frequency: 60 };
const sample = {
  timestamp: 18235.4, interval: 16.7, acceleration: { x: 0.1, y: -0.2, z: 0 },
  accelerationIncludingGravity: { x: 0.1, y: -0.2, z: 9.8 },
  rotationRate: { alpha: 1.5, beta: -0.3, gamma: 0 },
  orientation: { alpha: 112.4, beta: 3.1, gamma: -1.2, absolute: false },
};

function setup() {
  const post = vi.fn();
  vi.stubGlobal('parent', { postMessage: post });
  Function(runtimePrelude(['motion']))();
  const api = (window as unknown as { napplet: { motion: MotionApi } }).napplet.motion;
  const send = (type: string, payload: object, source: MessageEventSource = window.parent) => {
    window.dispatchEvent(new MessageEvent('message', { source, data: { type, ...payload } }));
  };
  return { post, api, send };
}

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'));
  vi.unstubAllGlobals();
  delete (window as unknown as { napplet?: unknown }).napplet;
});

describe('serialized MOTION conformance binding', () => {
  it('subscribes lazily, validates parent snapshots, isolates caches, and clears paused samples', () => {
    const { post, api, send } = setup();
    expect(post.mock.calls.filter(([message]) => message.type.startsWith('motion.'))).toEqual([]);
    expect(api.state()).toEqual(initial);
    expect(api.latest()).toBeNull();
    expect(post).toHaveBeenCalledWith({ type: 'motion.subscribe' }, '*');
    send('motion.state', focused, {} as MessageEventSource);
    send('motion.sample', sample);
    expect(api.latest()).toBeNull();
    send('motion.state', focused);
    send('motion.sample', { ...sample, acceleration: { x: NaN, y: 0, z: 0 } });
    expect(api.latest()).toBeNull();
    send('motion.sample', { ...sample, orientation: { ...sample.orientation, absolute: true } });
    expect(api.latest()).toBeNull();
    send('motion.sample', sample);
    expect(api.latest()).toEqual(sample);
    api.latest()!.acceleration!.x = 99;
    expect(api.latest()!.acceleration!.x).toBe(0.1);
    send('motion.state', { ...focused, focused: false, frequency: 0 });
    expect(api.latest()).toBeNull();
    send('motion.state', focused);
    expect(api.latest()).toBeNull();
  });

  it('correlates permission results without throwing on wire errors', async () => {
    const { post, api, send } = setup();
    const pending = api.requestPermission(true);
    const request = post.mock.calls.find(([message]) => message.type === 'motion.permission')![0];
    expect(request).toEqual({ type: 'motion.permission', id: expect.any(String), absolute: true });
    send('motion.permission.result', { id: request.id, permission: 'prompt', absolute: false });
    send('motion.permission.result', { id: request.id, permission: 'denied', absolute: false }, {} as MessageEventSource);
    send('motion.permission.result', { id: request.id, permission: 'prompt', absolute: false, error: 'Sensors unavailable' });
    await expect(pending).resolves.toEqual({ permission: 'prompt', absolute: false, error: 'Sensors unavailable' });
    const second = api.requestPermission();
    const next = post.mock.calls.filter(([message]) => message.type === 'motion.permission').at(-1)![0];
    expect(next).not.toHaveProperty('absolute');
    send('motion.permission.result', { id: next.id, permission: 'granted', absolute: false });
    await expect(second).resolves.toEqual({ permission: 'granted', absolute: false });
  });

  it('isolates listeners and closes duplicate callbacks independently', () => {
    const { api, send } = setup();
    const reported = vi.fn();
    vi.stubGlobal('queueMicrotask', reported);
    api.onSample(() => { throw new Error('listener failed'); });
    const handler = vi.fn();
    const first = api.onSample(handler);
    const second = api.onSample(handler);
    first.close();
    first.close();
    send('motion.state', focused);
    send('motion.sample', sample);
    expect(handler).toHaveBeenCalledExactlyOnceWith(sample);
    expect(reported).toHaveBeenCalledOnce();
    second.close();
    send('motion.sample', sample);
    expect(handler).toHaveBeenCalledTimes(1);
    const state = vi.fn();
    const stateSub = api.onState(state);
    send('motion.state', initial);
    expect(state).toHaveBeenCalledExactlyOnceWith(initial);
    stateSub.close();
  });

  it('unsubscribes on page teardown and leaves omitted domains absent', () => {
    const { api, post } = setup();
    api.state();
    window.dispatchEvent(new Event('pagehide'));
    expect(post).toHaveBeenCalledWith({ type: 'motion.unsubscribe' }, '*');
    Function(runtimePrelude([]))();
    expect((window as unknown as { napplet?: unknown }).napplet).not.toHaveProperty('motion');
  });

  it('applies all sensor denial features to the sandboxed frame', async () => {
    const pending = bootAndCollect({ url: 'about:blank', readyTimeoutMs: 60, settleMs: 0, runDegraded: false });
    await Promise.resolve();
    const frame = document.querySelector('iframe')!;
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
    expect(frame.getAttribute('allow')).toBe("gamepad 'none'; accelerometer 'none'; gyroscope 'none'; magnetometer 'none'");
    await pending;
  });
});

describe('literal MOTION state tools parity', () => {
  it('matches the package helpers on valid and malformed protocol vectors', () => {
    const literal = Function(`return ${MOTION_STATE_TOOLS_SOURCE};`)() as ReturnType<typeof createMotionStateTools>;
    const maintained = createMotionStateTools();
    const states: unknown[] = [
      initial, focused, { ...initial, available: false, reason: 'blocked' },
      { ...initial, available: false, reason: 'unavailable' },
      { ...initial, available: false }, { ...initial, frequency: 1 },
      { ...focused, frequency: 0 }, { ...focused, permission: 'denied' },
      { ...initial, absolute: true }, { ...focused, absolute: true },
      { ...focused, reason: 'blocked' }, { ...focused, frequency: Infinity }, null, [],
    ];
    const samples: unknown[] = [sample, { ...sample, orientation: null },
      { ...sample, acceleration: null, accelerationIncludingGravity: null, rotationRate: null },
      { ...sample, acceleration: { x: null, y: null, z: null } },
      { ...sample, interval: -1 }, { ...sample, timestamp: NaN },
      ...[361, -1, NaN].map((alpha) => ({ ...sample, orientation: { ...sample.orientation, alpha } })),
      { ...sample, rotationRate: {} }, { ...sample, orientation: [] }, {}, null,
    ];
    const results: unknown[] = [
      { permission: 'granted', absolute: true }, { permission: 'denied', absolute: false },
      { permission: 'prompt', absolute: false, error: 'Unavailable' },
      { permission: 'prompt', absolute: false }, { permission: 'denied', absolute: true },
      { permission: 'granted', absolute: false, error: false }, {}, null,
    ];
    for (const value of states) expect(literal.isMotionState(value)).toBe(maintained.isMotionState(value));
    for (const value of samples) expect(literal.isMotionSample(value)).toBe(maintained.isMotionSample(value));
    for (const value of results) expect(literal.isMotionPermissionResult(value)).toBe(maintained.isMotionPermissionResult(value));
    expect(literal.copyMotionSample(sample)).toEqual(maintained.copyMotionSample(sample));
    expect(literal.copyMotionSample(sample).acceleration).not.toBe(sample.acceleration);
    expect(literal.copyMotionState(initial)).toEqual(initial);
  });
});
