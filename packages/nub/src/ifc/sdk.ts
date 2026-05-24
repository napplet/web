/**
 * @napplet/nub/ifc -- SDK helpers wrapping window.napplet.ifc.
 *
 * These convenience functions delegate to `window.napplet.ifc.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal, NostrEvent, Subscription } from '@napplet/core';

function requireIfc(): NappletGlobal['ifc'] {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.ifc) {
    throw new Error('window.napplet.ifc not installed -- import @napplet/shim first');
  }
  return w.napplet.ifc;
}

/**
 * Broadcast an IFC-PEER event to other napplets via the shell.
 *
 * @param topic      The 't' tag value (e.g., 'profile:open')
 * @param extraTags  Additional NIP-01 tags beyond the 't' tag (default: [])
 * @param content    Event content (default: empty string)
 *
 * @example
 * ```ts
 * import { ifcEmit } from '@napplet/nub/ifc';
 *
 * ifcEmit('profile:open', [], JSON.stringify({ pubkey: '...' }));
 * ```
 */
export function ifcEmit(topic: string, extraTags?: string[][], content?: string): void {
  requireIfc().emit(topic, extraTags, content);
}

/**
 * Subscribe to IFC-PEER events on a specific topic.
 *
 * @param topic     The 't' tag value to listen for
 * @param callback  Called with `(payload, event)` for each matching event
 * @returns A Subscription handle with a `close()` method
 *
 * @example
 * ```ts
 * import { ifcOn } from '@napplet/nub/ifc';
 *
 * const sub = ifcOn('profile:open', (payload) => {
 *   console.log('Profile requested:', payload);
 * });
 * // Later: sub.close();
 * ```
 */
export function ifcOn(
  topic: string,
  callback: (payload: unknown, event: NostrEvent) => void,
): Subscription {
  return requireIfc().on(topic, callback);
}
