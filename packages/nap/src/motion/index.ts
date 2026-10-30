/** NAP-MOTION package entrypoint; canonical proposal: https://github.com/napplet/naps/pull/124. */
import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';
export { DOMAIN } from './types.js';
export type * from './types.js';
export { motion, requestPermission, state, latest, onState, onSample, installMotionShim, handleMotionMessage } from './shim.js';
export { motionRequestPermission, motionState, motionLatest, motionOnState, motionOnSample } from './sdk.js';
export { createMotionStateTools } from './state.js';
export type { MotionStateTools } from './state.js';

registerNap(DOMAIN, () => { /* The runtime supplies the domain handler. */ });
