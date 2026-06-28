/**
 * @napplet/nap/dm -- SDK helpers wrapping window.napplet.dm.
 *
 * These functions delegate to `window.napplet.dm.*` at call time. The shim must
 * be imported somewhere to install the global.
 */

import type {
  DmConversationPage,
  DmConversationQuery,
  DmMessage,
  DmMessagePage,
  DmMessageQuery,
  DmOk,
  DmSendRequest,
  DmSendResult,
  DmStatus,
  DmSubscribeRequest,
  DmSubscription,
  NappletGlobal,
  Subscription,
} from '@napplet/core';

function requireDm(): NonNullable<NappletGlobal['dm']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.dm) {
    throw new Error('window.napplet.dm is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.dm;
}

/**
 * Get current DM availability and advisory runtime labels.
 *
 * @returns Promise resolving to the runtime DM status
 */
export function dmStatus(): Promise<DmStatus> {
  return requireDm().status();
}

/**
 * Fetch normalized conversations visible to this napplet.
 *
 * @param query  Optional cursor and limit
 * @returns Promise resolving to a page of conversations
 */
export function dmConversations(query?: DmConversationQuery): Promise<DmConversationPage> {
  return requireDm().conversations(query);
}

/**
 * Fetch normalized message history for one conversation.
 *
 * @param query  Conversation id plus optional cursor and limit
 * @returns Promise resolving to a page of messages
 */
export function dmMessages(query: DmMessageQuery): Promise<DmMessagePage> {
  return requireDm().messages(query);
}

/**
 * Ask the runtime to send a direct message.
 *
 * @param request  Recipients, content, and optional conversation/client ids
 * @returns Promise resolving to the normalized send result
 */
export function dmSend(request: DmSendRequest): Promise<DmSendResult> {
  return requireDm().send(request);
}

/**
 * Start live delivery for one conversation or all visible conversations.
 *
 * @param request  Optional conversation scope
 * @returns Promise resolving to the runtime subscription id
 */
export function dmSubscribe(request?: DmSubscribeRequest): Promise<DmSubscription> {
  return requireDm().subscribe(request);
}

/**
 * Stop a live DM subscription.
 *
 * @param subscriptionId  Runtime subscription id from dmSubscribe()
 * @returns Promise resolving to the runtime acknowledgement
 */
export function dmUnsubscribe(subscriptionId: string): Promise<DmOk> {
  return requireDm().unsubscribe(subscriptionId);
}

/**
 * Register for shell-pushed `dm.message` deliveries.
 *
 * @param handler  Called with each message and its runtime subscription id
 * @returns A Subscription with `close()` to stop listening
 */
export function dmOnMessage(
  handler: (message: DmMessage, subscriptionId: string) => void,
): Subscription {
  return requireDm().onMessage(handler);
}
