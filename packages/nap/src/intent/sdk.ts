/**
 * Napplet NAP intent sdk entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/intent -- SDK helpers wrapping window.napplet.intent.
 *
 * These convenience functions delegate to `window.napplet.intent.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal, Subscription } from '@napplet/core';
import type {
  IntentRequest,
  IntentResult,
  IntentAvailability,
} from './types.js';

function requireIntent(): NonNullable<NappletGlobal['intent']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.intent) {
    throw new Error('window.napplet.intent is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.intent;
}

/**
 * Invoke a napplet by archetype.
 *
 * @param request  The intent request (archetype + action + convention + payload)
 * @returns Promise resolving to the invocation result
 *
 * @example
 * ```ts
 * import { intentInvoke } from '@napplet/nap/intent';
 *
 * const r = await intentInvoke({ archetype: 'note', payload: { target: { type: 'event', id } } });
 * ```
 */
export function intentInvoke(request: IntentRequest): Promise<IntentResult> {
  return requireIntent().invoke(request);
}

/**
 * Open a napplet by archetype (sugar for `action: "open"`).
 *
 * @param archetype  Role slug to open
 * @param payload    Opaque payload, shaped by the selected convention
 * @param opts       Extra request fields (convention, handler, behavior)
 * @returns Promise resolving to the invocation result
 *
 * @example
 * ```ts
 * import { intentOpen } from '@napplet/nap/intent';
 *
 * await intentOpen('emoji-list', { seed: ['🤙'] });
 * ```
 */
export function intentOpen(
  archetype: string,
  payload?: unknown,
  opts?: Omit<IntentRequest, 'archetype' | 'action' | 'payload'>,
): Promise<IntentResult> {
  return requireIntent().open(archetype, payload, opts);
}

/**
 * Check whether the runtime can currently satisfy an archetype.
 *
 * @param archetype  Role slug to check
 * @returns Promise resolving to the archetype availability
 */
export function intentAvailable(archetype: string): Promise<IntentAvailability> {
  return requireIntent().available(archetype);
}

/**
 * Get availability for every archetype the runtime can satisfy.
 *
 * @returns Promise resolving to availability for each satisfiable archetype
 */
export function intentHandlers(): Promise<IntentAvailability[]> {
  return requireIntent().handlers();
}

/**
 * Register for shell-pushed availability updates.
 *
 * @param handler  Called with each updated IntentAvailability
 * @returns A Subscription with `close()` to stop listening
 */
export function intentOnChanged(handler: (availability: IntentAvailability) => void): Subscription {
  return requireIntent().onChanged(handler);
}
