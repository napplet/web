/**
 * Napplet NAP dm -- Runtime-mediated direct messages module (NAP-DM).
 *
 * A napplet presents direct-message UI while the runtime owns signing,
 * encryption, relay routing, storage, key/session state, and policy. The
 * napplet sees normalized conversations, history, send results, and live
 * message delivery.
 *
 * @example
 * ```ts
 * import { dmConversations, dmSend, dmOnMessage } from '@napplet/nap/dm';
 *
 * const { conversations } = await dmConversations({ limit: 20 });
 * dmOnMessage((message) => console.log(message.content));
 * await dmSend({ recipients: ['<hex>'], content: 'hello' });
 * ```
 *
 * @module
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  DmConversation,
  DmConversationPage,
  DmConversationQuery,
  DmConversationsMessage,
  DmConversationsResultMessage,
  DmHexPubkey,
  DmInboundMessage,
  DmMessage,
  DmMessageEnvelope,
  DmMessageEventMessage,
  DmMessagePage,
  DmMessageQuery,
  DmMessageStatus,
  DmMessagesMessage,
  DmMessagesResultMessage,
  DmNapMessage,
  DmOk,
  DmError,
  DmOutboundMessage,
  DmPeer,
  DmSendMessage,
  DmSendRequest,
  DmSendResult,
  DmSendResultMessage,
  DmStatus,
  DmStatusMessage,
  DmStatusResultMessage,
  DmSubscribeMessage,
  DmSubscribeRequest,
  DmSubscribeResultMessage,
  DmSubscription,
  DmTimestamp,
  DmUnsubscribeMessage,
  DmUnsubscribeResultMessage,
} from './types.js';

export {
  installDmShim,
  handleDmMessage,
  status,
  conversations,
  messages,
  send,
  subscribe,
  unsubscribe,
  onMessage,
} from './shim.js';

export {
  dmStatus,
  dmConversations,
  dmMessages,
  dmSend,
  dmSubscribe,
  dmUnsubscribe,
  dmOnMessage,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the dm domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'dm'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
