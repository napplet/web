/**
 * Napplet NAP relay -- Relay NAP module.
 *
 * Exports typed message definitions for the relay domain, shim installer,
 * SDK helpers, and registers the 'relay' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { RelaySubscribeMessage, RelayNapMessage } from '@napplet/nap/relay';
 * import { DOMAIN, installRelayShim, relaySubscribe } from '@napplet/nap/relay';
 * ```
 *
 * @module
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  RelayMessage,
  RelaySubscribeMessage,
  RelayCloseMessage,
  RelayPublishMessage,
  RelayPublishEncryptedMessage,
  RelayQueryMessage,
  RelayEventResult,
  RelayEventSidecar,
  RelayEventMessage,
  RelayEoseMessage,
  RelayClosedMessage,
  RelayPublishResultMessage,
  RelayPublishEncryptedResultMessage,
  RelayQueryResultMessage,
  RelayOutboundMessage,
  RelayInboundMessage,
  RelayNapMessage,
} from './types.js';

export { installRelayShim, subscribe, publish, publishEncrypted, query } from './shim.js';

export { relaySubscribe, relayPublish, relayPublishEncrypted, relayQuery } from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the relay domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'relay'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
