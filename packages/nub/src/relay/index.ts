/**
 * @napplet/nub/relay -- Relay NUB module.
 *
 * Exports typed message definitions for the relay domain, shim installer,
 * SDK helpers, and registers the 'relay' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { RelaySubscribeMessage, RelayNubMessage } from '@napplet/nub/relay';
 * import { DOMAIN, installRelayShim, relaySubscribe } from '@napplet/nub/relay';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

// ─── Type Exports ──────────────────────────────────────────────────────────

export type {
  RelayMessage,
  RelaySubscribeMessage,
  RelayCloseMessage,
  RelayPublishMessage,
  RelayPublishEncryptedMessage,
  RelayQueryMessage,
  RelayEventMessage,
  RelayEoseMessage,
  RelayClosedMessage,
  RelayPublishResultMessage,
  RelayPublishEncryptedResultMessage,
  RelayQueryResultMessage,
  RelayOutboundMessage,
  RelayInboundMessage,
  RelayNubMessage,
} from './types.js';

// ─── Shim Exports ─────────────────────────────────────────────────────────

export { installRelayShim, subscribe, publish, publishEncrypted, query } from './shim.js';

// ─── SDK Exports ──────────────────────────────────────────────────────────

export { relaySubscribe, relayPublish, relayPublishEncrypted, relayQuery } from './sdk.js';

// ─── Domain Registration ───────────────────────────────────────────────────

import { registerNub } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the relay domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'relay'.
 */
registerNub(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
