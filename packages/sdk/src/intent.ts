import type {
  IntentAvailability,
  IntentInvokeOptions,
  IntentDelivery,
  IntentResult,
  Subscription,
} from '@napplet/core';
import { requireDomain } from './require-napplet.js';
import type { SdkDomain } from './sdk-domain.js';

/**
 * Archetype intent dispatch (NAP-INTENT): invoke an installed handler by role
 * without directly addressing a target instance.
 *
 * @example
 * ```ts
 * import { intent } from '@napplet/sdk';
 *
 * if ((await intent.available('note')).available) {
 *   await intent.open('napplet:note/open', { payload: { event: id } });
 * }
 * ```
 */
export const intent: SdkDomain<'intent'> = {
  /**
   * Invoke an archetype request.
   * @param uri Authoritative convention URI
   * @param options Structured payload and runtime selection hints
   * @returns Promise resolving to the dispatch result
   */
  invoke(uri: string, options?: IntentInvokeOptions): Promise<IntentResult> {
    return requireDomain('intent').invoke(uri, options);
  },

  /**
   * Open a napplet by archetype.
   * @param uri Convention URI whose action is open
   * @param options Structured payload and runtime selection hints
   * @returns Promise resolving to the dispatch result
   */
  open(
    uri: string,
    options?: IntentInvokeOptions,
  ): Promise<IntentResult> {
    return requireDomain('intent').open(uri, options);
  },

  /**
   * Check whether the runtime can currently satisfy an archetype and expose the
   * manifest-derived conventions each candidate serves.
   * @param archetype  Role slug to check
   * @returns Promise resolving to the archetype availability
   */
  available(archetype: string): Promise<IntentAvailability> {
    return requireDomain('intent').available(archetype);
  },

  /**
   * Get availability for every archetype the runtime can satisfy.
   * @returns Promise resolving to availability for each satisfiable archetype
   */
  handlers(): Promise<IntentAvailability[]> {
    return requireDomain('intent').handlers();
  },

  /**
   * Register for shell-pushed availability updates.
   * @param handler  Called with each updated IntentAvailability
   * @returns A Subscription with `close()` to stop listening
   */
  onChanged(handler: (availability: IntentAvailability) => void): Subscription {
    return requireDomain('intent').onChanged(handler);
  },

  /**
   * Receive runtime-attested deliveries, including those retained before registration.
   * @param handler Called with each delivery
   * @returns A Subscription with close() to stop listening
   * @example
   * intent.onDelivery(({ payload }) => render(payload));
   */
  onDelivery(handler: (delivery: IntentDelivery) => void): Subscription {
    return requireDomain('intent').onDelivery(handler);
  },
};
