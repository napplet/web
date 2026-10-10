/**
 * Napplet NAP inc sdk entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/inc -- SDK helpers wrapping window.napplet.inc.
 *
 * These convenience functions delegate to `window.napplet.inc.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type {
  ChannelHandle,
  ChannelInfo,
  IncEvent,
  NappletGlobal,
  Subscription,
} from '@napplet/core';

function requireInc(): NonNullable<NappletGlobal['inc']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.inc) {
    throw new Error('window.napplet.inc is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.inc;
}

/**
 * Broadcast an INC message to other napplets via the shell.
 *
 * @param topic    An opaque stable topic or convention URI
 * @param payload  Optional opaque payload for a queryless topic
 *
 * @example
 * ```ts
 * import { incEmit } from '@napplet/nap/inc';
 *
 * incEmit('napplet:profile/open', { pubkey: '...' });
 * ```
 */
export function incEmit(topic: string, payload?: unknown): void {
  requireInc().emit(topic, payload);
}

/**
 * Subscribe to INC events on a specific topic.
 *
 * @param topic     Exact topic value to listen for
 * @param callback  Called with one runtime-attested INC event
 * @returns A Subscription handle with a `close()` method
 *
 * @example
 * ```ts
 * import { incOn } from '@napplet/nap/inc';
 *
 * const sub = incOn('napplet:profile/open', (event) => {
 *   console.log('Profile requested:', event.payload);
 * });
 * // Later: sub.close();
 * ```
 */
export function incOn(
  topic: string,
  callback: (event: IncEvent) => void,
): Subscription {
  return requireInc().on(topic, callback);
}

/**
 * Open a point-to-point INC channel.
 *
 * @param target Target authenticated endpoint identifier
 * @returns Symmetric channel handle
 */
export function incOpenChannel(target: string): Promise<ChannelHandle> {
  return requireInc().channel.open(target);
}

/**
 * Subscribe to inbound INC channels.
 *
 * @param callback Called with each symmetric channel handle
 * @returns Subscription handle
 */
export function incOnChannelOpened(
  callback: (handle: ChannelHandle) => void,
): Subscription {
  return requireInc().channel.onOpened(callback);
}

/**
 * List active INC channels.
 *
 * @returns Active channel snapshots
 */
export function incListChannels(): Promise<ChannelInfo[]> {
  return requireInc().channel.list();
}

/**
 * Broadcast to all open INC channel peers.
 *
 * @param payload Optional opaque payload
 * @returns Nothing
 */
export function incBroadcast(payload?: unknown): void {
  requireInc().channel.broadcast(payload);
}
