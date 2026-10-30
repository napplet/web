/** NAP-MOTION schemas: https://github.com/napplet/naps/pull/124. */
import type { Subscription } from './nostr.js';

export type MotionPermission = 'prompt' | 'granted' | 'denied';
export type MotionUnavailableReason = 'blocked' | 'unavailable';

/** Complete sensor availability and grant snapshot for this napplet. */
export interface MotionState {
  available: boolean;
  reason?: MotionUnavailableReason;
  permission: MotionPermission;
  absolute: boolean;
  focused: boolean;
  frequency: number;
}

/** A permission outcome; prompt is valid only when an error is present. */
export interface MotionPermissionResult {
  permission: MotionPermission;
  absolute: boolean;
  error?: string;
}

/** Device-axis acceleration, in metres per second squared. */
export interface Vector3 {
  x: number | null;
  y: number | null;
  z: number | null;
}

/** Device rotation around z, x, and y axes, in degrees per second. */
export interface RotationRate {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

/** Orientation in degrees; absolute means Earth-referenced. */
export interface Orientation extends RotationRate {
  absolute: boolean;
}

/** A live reading; unavailable sensor values stay null. */
export interface MotionSample {
  timestamp: number;
  interval: number;
  acceleration: Vector3 | null;
  accelerationIncludingGravity: Vector3 | null;
  rotationRate: RotationRate | null;
  orientation: Orientation | null;
}

/** Optional runtime domain with synchronous cached reads. */
export interface MotionApi {
  requestPermission(absolute?: boolean): Promise<MotionPermissionResult>;
  state(): MotionState;
  latest(): MotionSample | null;
  onState(handler: (state: MotionState) => void): Subscription;
  onSample(handler: (sample: MotionSample) => void): Subscription;
}
