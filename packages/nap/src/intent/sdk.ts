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
  IntentAvailability,
  IntentDelivery,
  IntentInvokeOptions,
  IntentResult,
} from './types.js';

function requireIntent(): NonNullable<NappletGlobal['intent']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.intent) {
    throw new Error('window.napplet.intent is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.intent;
}

/**
 * Ask the runtime to accept responsibility for a convention-URI delivery.
 *
 * @param uri      Authoritative `napplet:<archetype>/<intent>[...?params]` URI
 * @param options  Optional explicit payload, handler preference, and behavior hints
 * @returns Promise resolving to immediate acceptance or pre-acceptance rejection
 *
 * @example
 * ```ts
 * import { intentInvoke } from '@napplet/nap/intent';
 *
 * const r = await intentInvoke(`napplet:note/open?event=${encodeURIComponent(id)}`);
 * ```
 */
export function intentInvoke(
  uri: string,
  options?: IntentInvokeOptions,
): Promise<IntentResult> {
  return requireIntent().invoke(uri, options);
}

/**
 * Invoke a convention URI whose intent is `open`.
 *
 * @param uri      Authoritative `napplet:<archetype>/open[...?params]` URI
 * @param options  Optional explicit payload, handler preference, and behavior hints
 * @returns Promise resolving to immediate acceptance or pre-acceptance rejection
 *
 * @example
 * ```ts
 * import { intentOpen } from '@napplet/nap/intent';
 *
 * await intentOpen('napplet:emoji-list/open', { payload: { seed: ['🤙'] } });
 * ```
 */
export function intentOpen(
  uri: string,
  options?: IntentInvokeOptions,
): Promise<IntentResult> {
  return requireIntent().open(uri, options);
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

/**
 * Register for target-only deliveries accepted earlier by the runtime.
 *
 * Delivery is independent of the source lifetime and carries runtime-attested
 * sender provenance. It is not a completion notification for the invoke call.
 *
 * @param handler  Called with each carrier-neutral delivery
 * @returns A Subscription with `close()` to stop listening
 */
export function intentOnDelivery(handler: (delivery: IntentDelivery) => void): Subscription {
  return requireIntent().onDelivery(handler);
}
