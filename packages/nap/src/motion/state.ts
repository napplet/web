/** Pure schema and snapshot helpers shared with serialized runtime preludes. */
import type { MotionPermissionResult, MotionSample, MotionState } from './types.js';

export interface MotionStateTools {
  isMotionState(value: unknown): value is MotionState;
  isMotionSample(value: unknown): value is MotionSample;
  isMotionPermissionResult(value: unknown): value is MotionPermissionResult;
  copyMotionState(value: MotionState): MotionState;
  copyMotionSample(value: MotionSample): MotionSample;
}

/**
 * Create self-contained helpers for the NAP-MOTION schemas and gating invariants.
 * @returns Validators and independent snapshot copies.
 * @example const tools = createMotionStateTools();
 */
export function createMotionStateTools(): MotionStateTools {
  function record(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  function finite(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }
  function permission(value: unknown): boolean {
    return value === 'prompt' || value === 'granted' || value === 'denied';
  }
  function nullableNumber(value: unknown, min = -Infinity, max = Infinity): boolean {
    return value === null || (finite(value) && value >= min && value <= max);
  }
  function vector(value: unknown, keys: string[]): boolean {
    return value === null || (record(value) && keys.every((key) => nullableNumber(value[key])));
  }
  function orientation(value: unknown): boolean {
    if (value === null) return true;
    return record(value) && typeof value.absolute === 'boolean'
      && nullableNumber(value.alpha, 0, 360) && nullableNumber(value.beta, -180, 180)
      && nullableNumber(value.gamma, -90, 90);
  }
  function isMotionState(value: unknown): value is MotionState {
    if (!record(value) || typeof value.available !== 'boolean' || !permission(value.permission)) return false;
    if (typeof value.absolute !== 'boolean' || typeof value.focused !== 'boolean') return false;
    if (!finite(value.frequency) || value.frequency < 0) return false;
    if (value.available ? value.reason !== undefined : value.reason !== 'blocked' && value.reason !== 'unavailable') return false;
    if (value.focused && (!value.available || value.permission !== 'granted' || value.frequency === 0)) return false;
    if (!value.focused && value.frequency !== 0) return false;
    return !value.absolute || value.permission === 'granted';
  }
  function isMotionSample(value: unknown): value is MotionSample {
    if (!record(value) || !finite(value.timestamp) || !finite(value.interval) || value.interval < 0) return false;
    return vector(value.acceleration, ['x', 'y', 'z']) && vector(value.accelerationIncludingGravity, ['x', 'y', 'z'])
      && vector(value.rotationRate, ['alpha', 'beta', 'gamma']) && orientation(value.orientation);
  }
  function isMotionPermissionResult(value: unknown): value is MotionPermissionResult {
    if (!record(value) || !permission(value.permission) || typeof value.absolute !== 'boolean') return false;
    if (value.error !== undefined && typeof value.error !== 'string') return false;
    if (value.permission === 'prompt' && value.error === undefined) return false;
    return !value.absolute || value.permission === 'granted';
  }
  function copyMotionState(value: MotionState): MotionState {
    return {
      available: value.available, permission: value.permission, absolute: value.absolute,
      focused: value.focused, frequency: value.frequency,
      ...(value.reason === undefined ? {} : { reason: value.reason }),
    };
  }
  function copyMotionSample(value: MotionSample): MotionSample {
    return {
      timestamp: value.timestamp, interval: value.interval,
      acceleration: value.acceleration === null ? null : { x: value.acceleration.x, y: value.acceleration.y, z: value.acceleration.z },
      accelerationIncludingGravity: value.accelerationIncludingGravity === null ? null : {
        x: value.accelerationIncludingGravity.x, y: value.accelerationIncludingGravity.y, z: value.accelerationIncludingGravity.z,
      },
      rotationRate: value.rotationRate === null ? null : {
        alpha: value.rotationRate.alpha, beta: value.rotationRate.beta, gamma: value.rotationRate.gamma,
      },
      orientation: value.orientation === null ? null : {
        alpha: value.orientation.alpha, beta: value.orientation.beta, gamma: value.orientation.gamma, absolute: value.orientation.absolute,
      },
    };
  }
  return { isMotionState, isMotionSample, isMotionPermissionResult, copyMotionState, copyMotionSample };
}
