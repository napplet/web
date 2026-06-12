/**
 * @napplet/nap/inc -- INC NAP module.
 *
 * Exports typed message definitions for the inc domain, shim installer,
 * SDK helpers, and registers the 'inc' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { IncEmitMessage, IncChannelMessage, IncNapMessage } from '@napplet/nap/inc';
 * import { DOMAIN, installIncShim, incEmit, incOn } from '@napplet/nap/inc';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  IncMessage,
  IncEmitMessage,
  IncSubscribeMessage,
  IncSubscribeResultMessage,
  IncUnsubscribeMessage,
  IncEventMessage,
  IncChannelOpenMessage,
  IncChannelOpenResultMessage,
  IncChannelEmitMessage,
  IncChannelEventMessage,
  IncChannelBroadcastMessage,
  IncChannelListMessage,
  IncChannelListResultMessage,
  IncChannelCloseMessage,
  IncChannelClosedMessage,
  IncTopicMessage,
  IncChannelMessage,
  IncOutboundMessage,
  IncInboundMessage,
  IncNapMessage,
} from './types.js';

export { installIncShim, emit, on, handleIncEvent } from './shim.js';

export { incEmit, incOn } from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the inc domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'inc'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
