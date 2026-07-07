/**
 * Napplet NAP outbox domain entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/outbox -- Outbox-aware relay routing NAP module (NAP-OUTBOX).
 *
 * Outbox-model relay routing through the shell. A napplet supplies Nostr filters
 * and intent; the runtime discovers the correct relays (NIP-65 write/read relays,
 * fallbacks, relay intelligence), queries them, deduplicates events by id,
 * validates signatures, and streams updates. The shell owns relay discovery,
 * routing, fallback, deduplication, signing, and publish fanout policy.
 *
 * Exports typed message definitions for the outbox domain, shim installer,
 * SDK helpers, and registers the 'outbox' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { OutboxResult, OutboxSubscription } from '@napplet/nap/outbox';
 * import { DOMAIN, installOutboxShim, outboxQuery } from '@napplet/nap/outbox';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  RelayEventResult,
  OutboxEventOptions,
  OutboxQueryOptions,
  OutboxSubscribeOptions,
  OutboxPublishOptions,
  OutboxTarget,
  OutboxRelayPlan,
  OutboxEventResult,
  OutboxResult,
  OutboxPublishResult,
  OutboxSubscription,
  OutboxMessage,
  OutboxGetEventMessage,
  OutboxGetEventResultMessage,
  OutboxQueryMessage,
  OutboxQueryResultMessage,
  OutboxSubscribeMessage,
  OutboxEventMessage,
  OutboxClosedMessage,
  OutboxCloseMessage,
  OutboxPublishMessage,
  OutboxPublishResultMessage,
  OutboxResolveRelaysMessage,
  OutboxResolveRelaysResultMessage,
  OutboxOutboundMessage,
  OutboxInboundMessage,
  OutboxNapMessage,
} from './types.js';

export {
  installOutboxShim,
  handleOutboxMessage,
  getEvent,
  query,
  subscribe,
  publish,
  resolveRelays,
} from './shim.js';

export {
  outboxGetEvent,
  outboxQuery,
  outboxSubscribe,
  outboxPublish,
  outboxResolveRelays,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the outbox domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'outbox'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
