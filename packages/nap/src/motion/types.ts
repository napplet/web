/** NAP-MOTION envelopes from https://github.com/napplet/naps/pull/124. */
import type { MotionPermissionResult, MotionSample, MotionState, NappletMessage } from '@napplet/core';

export const DOMAIN = 'motion' as const;
export type {
  MotionApi, MotionPermission, MotionPermissionResult, MotionSample, MotionState,
  MotionUnavailableReason, Orientation, RotationRate, Vector3,
} from '@napplet/core';

export interface MotionSubscribeMessage extends NappletMessage {
  type: 'motion.subscribe';
  frequency?: number;
}
export interface MotionUnsubscribeMessage extends NappletMessage {
  type: 'motion.unsubscribe';
}
export interface MotionPermissionMessage extends NappletMessage {
  type: 'motion.permission';
  id: string;
  absolute?: boolean;
}
export interface MotionPermissionResultMessage extends NappletMessage, MotionPermissionResult {
  type: 'motion.permission.result';
  id: string;
}
export interface MotionStateMessage extends NappletMessage, MotionState {
  type: 'motion.state';
}
export interface MotionSampleMessage extends NappletMessage, MotionSample {
  type: 'motion.sample';
}
export type MotionRequestMessage = MotionSubscribeMessage | MotionUnsubscribeMessage | MotionPermissionMessage;
export type MotionNapMessage = MotionRequestMessage | MotionPermissionResultMessage | MotionStateMessage | MotionSampleMessage;
