// @napplet/nap -- shared iframe-boundary post helper.
// Every NAP shim crosses the napplet ⇄ shell boundary through this single
// chokepoint instead of calling `window.parent.postMessage(msg, '*')` directly,
// so a non-structured-cloneable argument (a Svelte/Vue/Solid reactive Proxy) is
// recovered or surfaced loudly per @napplet/core's clone mode rather than
// throwing a DataCloneError that gets silently swallowed in an async path.
// See napplet/web#67.

import { sendEnvelope } from '@napplet/core';

/**
 * Post a JSON envelope to the shell (`window.parent`) across the iframe
 * boundary. Delegates clone-safety to {@link sendEnvelope}.
 *
 * @param message - The envelope; must carry a `type` discriminator.
 */
export function postToShell<T extends { type: string }>(message: T): void {
  sendEnvelope(window.parent, message);
}
