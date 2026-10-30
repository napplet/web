/** Application-side helpers delegate to the current runtime-injected motion domain. */
import type { MotionPermissionResult, MotionSample, MotionState, NappletGlobal, Subscription } from '@napplet/core';

function requireMotion(): NonNullable<NappletGlobal['motion']> {
  const napplet = (window as Window & { napplet?: NappletGlobal }).napplet;
  if (!napplet?.motion) throw new Error('window.napplet.motion is unavailable -- runtime did not inject this domain');
  return napplet.motion;
}

/**
 * Request a motion grant from a user action.
 * @param absolute Whether to also request absolute orientation.
 * @returns The runtime's permission outcome.
 * @example const grant = await motionRequestPermission();
 */
export function motionRequestPermission(absolute?: boolean): Promise<MotionPermissionResult> {
  return requireMotion().requestPermission(absolute);
}

/**
 * Read cached sensor and grant state.
 * @returns The current state snapshot.
 * @example const status = motionState();
 */
export function motionState(): MotionState { return requireMotion().state(); }

/**
 * Read the latest focused sample.
 * @returns A sample or null during a pause.
 * @example const sample = motionLatest();
 */
export function motionLatest(): MotionSample | null { return requireMotion().latest(); }

/**
 * Observe state changes.
 * @param handler Receives runtime state snapshots.
 * @returns A closable local subscription.
 * @example const subscription = motionOnState(renderStatus);
 */
export function motionOnState(handler: (state: MotionState) => void): Subscription { return requireMotion().onState(handler); }

/**
 * Observe granted and focused motion samples.
 * @param handler Receives runtime samples.
 * @returns A closable local subscription.
 * @example const subscription = motionOnSample(updateTilt);
 */
export function motionOnSample(handler: (sample: MotionSample) => void): Subscription { return requireMotion().onSample(handler); }
