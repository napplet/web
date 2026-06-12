/**
 * @napplet/nap/inc -- SDK helpers wrapping window.napplet.inc.
 *
 * These convenience functions delegate to `window.napplet.inc.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal, NostrEvent, Subscription } from '@napplet/core';

function requireInc(): NappletGlobal['inc'] {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.inc) {
    throw new Error('window.napplet.inc not installed -- import @napplet/shim first');
  }
  return w.napplet.inc;
}

/**
 * Broadcast an INC-PEER event to other napplets via the shell.
 *
 * @param topic      The 't' tag value (e.g., 'profile:open')
 * @param extraTags  Additional NIP-01 tags beyond the 't' tag (default: [])
 * @param content    Event content (default: empty string)
 *
 * @example
 * ```ts
 * import { incEmit } from '@napplet/nap/inc';
 *
 * incEmit('profile:open', [], JSON.stringify({ pubkey: '...' }));
 * ```
 */
export function incEmit(topic: string, extraTags?: string[][], content?: string): void {
  requireInc().emit(topic, extraTags, content);
}

/**
 * Subscribe to INC-PEER events on a specific topic.
 *
 * @param topic     The 't' tag value to listen for
 * @param callback  Called with `(payload, event)` for each matching event
 * @returns A Subscription handle with a `close()` method
 *
 * @example
 * ```ts
 * import { incOn } from '@napplet/nap/inc';
 *
 * const sub = incOn('profile:open', (payload) => {
 *   console.log('Profile requested:', payload);
 * });
 * // Later: sub.close();
 * ```
 */
export function incOn(
  topic: string,
  callback: (payload: unknown, event: NostrEvent) => void,
): Subscription {
  return requireInc().on(topic, callback);
}
