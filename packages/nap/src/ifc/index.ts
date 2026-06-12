/**
 * @napplet/nap/ifc -- IFC NAP module.
 *
 * Exports typed message definitions for the ifc domain, shim installer,
 * SDK helpers, and registers the 'ifc' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { IfcEmitMessage, IfcChannelMessage, IfcNapMessage } from '@napplet/nap/ifc';
 * import { DOMAIN, installIfcShim, ifcEmit, ifcOn } from '@napplet/nap/ifc';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  IfcMessage,
  IfcEmitMessage,
  IfcSubscribeMessage,
  IfcSubscribeResultMessage,
  IfcUnsubscribeMessage,
  IfcEventMessage,
  IfcChannelOpenMessage,
  IfcChannelOpenResultMessage,
  IfcChannelEmitMessage,
  IfcChannelEventMessage,
  IfcChannelBroadcastMessage,
  IfcChannelListMessage,
  IfcChannelListResultMessage,
  IfcChannelCloseMessage,
  IfcChannelClosedMessage,
  IfcTopicMessage,
  IfcChannelMessage,
  IfcOutboundMessage,
  IfcInboundMessage,
  IfcNapMessage,
} from './types.js';

export { installIfcShim, emit, on, handleIfcEvent } from './shim.js';

export { ifcEmit, ifcOn } from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the ifc domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'ifc'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
