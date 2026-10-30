import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motion, requestPermission, state, latest, onState, onSample } from '@napplet/sdk/motion';
import {
  motion as rootMotion, MOTION_DOMAIN, motionRequestPermission, motionState, motionLatest, motionOnState, motionOnSample,
} from '@napplet/sdk';

test('built root, subpath, aliases, and NAP layers expose motion through the current injected domain', async () => {
  assert.equal(MOTION_DOMAIN, 'motion');
  assert.equal(rootMotion, motion);
  const previous = globalThis.window;
  const calls = [];
  const result = { permission: 'granted', absolute: false };
  const snapshot = { available: true, permission: 'granted', absolute: false, focused: true, frequency: 60 };
  const sample = { timestamp: 18235.4, interval: 16.7, acceleration: null, accelerationIncludingGravity: null,
    rotationRate: null, orientation: null };
  const listener = () => {};
  const handle = { close() {} };
  try {
    globalThis.window = { napplet: { motion: {
      requestPermission: async (absolute) => { calls.push(absolute); return result; },
      state: () => snapshot, latest: () => sample,
      onState: (handler) => { assert.equal(handler, listener); return handle; },
      onSample: (handler) => { assert.equal(handler, listener); return handle; },
    } } };
    for (const fn of [motion.requestPermission, requestPermission, motionRequestPermission]) assert.equal(await fn(true), result);
    assert.deepEqual(calls, [true, true, true]);
    for (const fn of [motion.state, state, motionState]) assert.equal(fn(), snapshot);
    for (const fn of [motion.latest, latest, motionLatest]) assert.equal(fn(), sample);
    for (const fn of [motion.onState, onState, motionOnState, motion.onSample, onSample, motionOnSample]) {
      assert.equal(fn(listener), handle);
    }
    const nap = await import('@napplet/nap/motion');
    const napSdk = await import('@napplet/nap/motion/sdk');
    const napShim = await import('@napplet/nap/motion/shim');
    const types = await import('@napplet/nap/motion/types');
    assert.equal(nap.DOMAIN, types.DOMAIN);
    assert.equal(nap.motion, napShim.motion);
    assert.equal(napSdk.motionState(), snapshot);
    globalThis.window.napplet = {};
    assert.throws(() => motion.state(), /motion/);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
