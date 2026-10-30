/** NAP-MOTION wrappers for the runtime-injected domain. */
import type { MotionApi } from '@napplet/core';
import { motionRequestPermission, motionState, motionLatest, motionOnState, motionOnSample } from '@napplet/nap/motion/sdk';

/**
 * Optional motion API, backed by window.napplet.motion.
 * @example if (window.napplet?.motion) await motion.requestPermission();
 */
export const motion: MotionApi = {
  requestPermission: motionRequestPermission,
  state: motionState,
  latest: motionLatest,
  onState: motionOnState,
  onSample: motionOnSample,
};

export {
  motionRequestPermission,
  motionState,
  motionLatest,
  motionOnState,
  motionOnSample,
  motionRequestPermission as requestPermission,
  motionState as state,
  motionLatest as latest,
  motionOnState as onState,
  motionOnSample as onSample,
};
export type {
  MotionApi, MotionPermission, MotionPermissionResult, MotionSample, MotionState,
  MotionUnavailableReason, Orientation, RotationRate, Vector3,
} from '@napplet/core';
