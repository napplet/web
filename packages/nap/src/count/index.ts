/**
 * @napplet/nap/count -- Runtime-mediated event counts.
 *
 * NAP-COUNT lets a sandboxed napplet request aggregate counts for NIP-01
 * filters while the runtime owns relay COUNT support, indexes, caches,
 * approximation, relay disclosure, and refusal policy.
 *
 * @example
 * ```ts
 * import { countQuery } from '@napplet/nap/count';
 *
 * const result = await countQuery({ kinds: [7], '#e': [eventId] });
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  CountFilter,
  CountOptions,
  CountResult,
  CountMessage,
  CountQueryMessage,
  CountQueryResultMessage,
  CountOutboundMessage,
  CountInboundMessage,
  CountNapMessage,
} from './types.js';

export {
  installCountShim,
  handleCountMessage,
  query,
} from './shim.js';

export { countQuery } from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the count domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
