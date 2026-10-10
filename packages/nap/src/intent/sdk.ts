/**
 * Napplet NAP intent SDK entrypoint.
 *
 * @module
 */

import type { NappletGlobal, Subscription } from '@napplet/core';
import type {
  IntentAvailability,
  IntentInvokeOptions,
  IntentDelivery,
  IntentResult,
} from './types.js';

function requireIntent(): NonNullable<NappletGlobal['intent']> {
  const target = window as Window & { napplet?: NappletGlobal };
  if (!target.napplet?.intent) {
    throw new Error('window.napplet.intent is unavailable -- runtime did not inject this domain');
  }
  return target.napplet.intent;
}

/**
 * Invoke a napplet by archetype.
 *
 * @param uri Authoritative convention URI
 * @param options Structured payload and runtime selection hints
 * @returns Promise resolving to the dispatch result
 *
 * @example
 * ```ts
 * await intentInvoke('napplet:note/open', { payload: { id: 'abc' } });
 * ```
 */
export function intentInvoke(uri: string, options?: IntentInvokeOptions): Promise<IntentResult> {
  return requireIntent().invoke(uri, options);
}

/**
 * Open a napplet by archetype.
 *
 * @param uri Convention URI whose action is open
 * @param options Structured payload and runtime selection hints
 * @returns Promise resolving to the dispatch result
 *
 * @example
 * ```ts
 * await intentOpen('napplet:note/open', { payload: { id: 'abc' } });
 * ```
 */
export function intentOpen(
  uri: string,
  options?: IntentInvokeOptions,
): Promise<IntentResult> {
  return requireIntent().open(uri, options);
}

/**
 * Check whether the runtime can satisfy an archetype.
 *
 * @param archetype Role slug to inspect
 * @returns Installed-catalog availability
 */
export function intentAvailable(archetype: string): Promise<IntentAvailability> {
  return requireIntent().available(archetype);
}

/**
 * List every archetype the runtime can satisfy.
 *
 * @returns Installed-catalog availability records
 */
export function intentHandlers(): Promise<IntentAvailability[]> {
  return requireIntent().handlers();
}

/**
 * Subscribe to runtime-pushed availability changes.
 *
 * @param handler Callback for each availability update
 * @returns Subscription handle
 */
export function intentOnChanged(handler: (availability: IntentAvailability) => void): Subscription {
  return requireIntent().onChanged(handler);
}

/**
 * Subscribe to intent deliveries from the runtime.
 * @param handler Callback for retained and future deliveries
 * @returns Subscription handle
 * @example
 * intentOnDelivery(({ payload }) => render(payload));
 */
export function intentOnDelivery(handler: (delivery: IntentDelivery) => void): Subscription {
  return requireIntent().onDelivery(handler);
}
