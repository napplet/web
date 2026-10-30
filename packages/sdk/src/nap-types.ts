/**
 * @napplet/sdk -- Type-only re-exports from `@napplet/core` and `@napplet/nap/*`.
 *
 * @packageDocumentation
 */

export type * from './nap-types-foundation.js';
export type * from './nap-types-services.js';
export type * from './nap-types-devices.js';

export type { ShellApi, ShellCapabilities, ShellEnvironment } from '@napplet/core';

export type * from '@napplet/nap/gamepad/types';

export type {
  MotionApi, MotionPermission, MotionPermissionResult, MotionSample, MotionState, MotionUnavailableReason,
  Orientation, RotationRate, Vector3, MotionSubscribeMessage, MotionUnsubscribeMessage, MotionPermissionMessage,
  MotionPermissionResultMessage, MotionStateMessage, MotionSampleMessage, MotionRequestMessage, MotionNapMessage,
} from '@napplet/nap/motion/types';
