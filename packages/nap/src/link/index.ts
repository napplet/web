/**
 * Napplet NAP link -- Shell-mediated link opening NAP module.
 *
 * NAP-LINK lets a sandboxed napplet ask the shell to open an external URL for
 * user-visible navigation. It is not resource fetching: the shell owns policy,
 * prompting, opener isolation, and the final browser context, and the napplet
 * never receives fetched bytes.
 *
 * @example
 * ```ts
 * import { linkOpen } from '@napplet/nap/link';
 *
 * const result = await linkOpen('https://example.com/post/123', { label: 'Read post' });
 * ```
 *
 * @module
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  LinkOpenErrorCode,
  LinkOpenOptions,
  LinkOpenResult,
  LinkOpenStatus,
  LinkMessage,
  LinkOpenMessage,
  LinkOpenResultMessage,
  LinkOutboundMessage,
  LinkInboundMessage,
  LinkNapMessage,
} from './types.js';

export {
  installLinkShim,
  handleLinkMessage,
  open,
} from './shim.js';

export { linkOpen } from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the link domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
