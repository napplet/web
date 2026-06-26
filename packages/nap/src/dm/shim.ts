// @napplet/nap/dm -- Runtime-mediated direct-message shim.
// Correlates dm.* request/result envelopes and routes dm.message pushes.

import { postToShell } from '../boundary.js';
import type { Subscription } from '@napplet/core';
import type {
  DmConversationPage,
  DmConversationQuery,
  DmConversationsMessage,
  DmConversationsResultMessage,
  DmMessage,
  DmMessageEventMessage,
  DmMessagePage,
  DmMessageQuery,
  DmMessagesMessage,
  DmMessagesResultMessage,
  DmOk,
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
  DmUnsubscribeMessage,
  DmUnsubscribeResultMessage,
} from './types.js';

/** Default timeout for DM request-response operations. */
const REQUEST_TIMEOUT_MS = 30_000;

interface Pending<T> {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const pendingStatus = new Map<string, Pending<DmStatus>>();
const pendingConversations = new Map<string, Pending<DmConversationPage>>();
const pendingMessages = new Map<string, Pending<DmMessagePage>>();
const pendingSend = new Map<string, Pending<DmSendResult>>();
const pendingSubscribe = new Map<string, Pending<DmSubscription>>();
const pendingUnsubscribe = new Map<string, Pending<DmOk>>();
const messageHandlers = new Set<(message: DmMessage, subscriptionId: string) => void>();

let installed = false;

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

function createPending<T>(
  map: Map<string, Pending<T>>,
  id: string,
  action: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (map.delete(id)) reject(new Error(`${action} timed out`));
    }, REQUEST_TIMEOUT_MS);
    map.set(id, { resolve, reject, timeout });
  });
}

function settle<T>(
  map: Map<string, Pending<T>>,
  id: string,
  error: string | undefined,
  fallbackError: string,
  getValue: () => T | undefined,
): void {
  const pending = map.get(id);
  if (!pending) return;
  map.delete(id);
  clearTimeout(pending.timeout);
  if (error) {
    pending.reject(new Error(error));
    return;
  }
  const value = getValue();
  if (value === undefined) {
    pending.reject(new Error(fallbackError));
    return;
  }
  pending.resolve(value);
}

function handleStatusResult(msg: DmStatusResultMessage): void {
  settle(
    pendingStatus,
    msg.id,
    msg.error,
    'dm.status.result missing status',
    () => {
      if (
        typeof msg.available !== 'boolean' ||
        !Array.isArray(msg.implementations) ||
        !Array.isArray(msg.capabilities)
      ) {
        return undefined;
      }
      return {
        available: msg.available,
        ...(msg.ownerPubkey === undefined ? {} : { ownerPubkey: msg.ownerPubkey }),
        implementations: msg.implementations,
        capabilities: msg.capabilities,
      };
    },
  );
}

function handleConversationsResult(msg: DmConversationsResultMessage): void {
  settle(
    pendingConversations,
    msg.id,
    msg.error,
    'dm.conversations.result missing conversations',
    () => {
      if (!Array.isArray(msg.conversations)) return undefined;
      return {
        conversations: msg.conversations,
        ...(msg.cursor === undefined ? {} : { cursor: msg.cursor }),
      };
    },
  );
}

function handleMessagesResult(msg: DmMessagesResultMessage): void {
  settle(
    pendingMessages,
    msg.id,
    msg.error,
    'dm.messages.result missing messages',
    () => {
      if (!Array.isArray(msg.messages)) return undefined;
      return {
        messages: msg.messages,
        ...(msg.cursor === undefined ? {} : { cursor: msg.cursor }),
      };
    },
  );
}

function handleSendResult(msg: DmSendResultMessage): void {
  settle(
    pendingSend,
    msg.id,
    msg.error,
    'dm.send.result missing message',
    () => {
      if (typeof msg.ok !== 'boolean' || msg.message === undefined) return undefined;
      return { ok: msg.ok, message: msg.message };
    },
  );
}

function handleSubscribeResult(msg: DmSubscribeResultMessage): void {
  settle(
    pendingSubscribe,
    msg.id,
    msg.error,
    'dm.subscribe.result missing subscriptionId',
    () => {
      if (typeof msg.subscriptionId !== 'string') return undefined;
      return { subscriptionId: msg.subscriptionId };
    },
  );
}

function handleUnsubscribeResult(msg: DmUnsubscribeResultMessage): void {
  settle(
    pendingUnsubscribe,
    msg.id,
    msg.error,
    'dm.unsubscribe.result missing ok',
    () => {
      if (typeof msg.ok !== 'boolean') return undefined;
      return { ok: msg.ok };
    },
  );
}

function handleMessageEvent(msg: DmMessageEventMessage): void {
  if (!msg.message || typeof msg.subscriptionId !== 'string') return;
  for (const handler of messageHandlers) handler(msg.message, msg.subscriptionId);
}

/**
 * Handle dm.* messages from the shell via the central message listener.
 * Covers request results and shell-pushed dm.message deliveries.
 *
 * @param msg  The shell envelope to route
 */
export function handleDmMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<DmStatusResultMessage>(msg, 'dm.status.result')) {
    handleStatusResult(msg);
  } else if (isMessageType<DmConversationsResultMessage>(msg, 'dm.conversations.result')) {
    handleConversationsResult(msg);
  } else if (isMessageType<DmMessagesResultMessage>(msg, 'dm.messages.result')) {
    handleMessagesResult(msg);
  } else if (isMessageType<DmSendResultMessage>(msg, 'dm.send.result')) {
    handleSendResult(msg);
  } else if (isMessageType<DmSubscribeResultMessage>(msg, 'dm.subscribe.result')) {
    handleSubscribeResult(msg);
  } else if (isMessageType<DmUnsubscribeResultMessage>(msg, 'dm.unsubscribe.result')) {
    handleUnsubscribeResult(msg);
  } else if (isMessageType<DmMessageEventMessage>(msg, 'dm.message')) {
    handleMessageEvent(msg);
  }
}

/**
 * Get current DM availability and advisory runtime labels.
 *
 * @returns Promise resolving to the runtime DM status
 *
 * @example
 * ```ts
 * const current = await status();
 * if (current.available) renderDm();
 * ```
 */
export function status(): Promise<DmStatus> {
  const id = crypto.randomUUID();
  const promise = createPending(pendingStatus, id, 'dm.status');
  const msg: DmStatusMessage = { type: 'dm.status', id };
  postToShell(msg);
  return promise;
}

/**
 * Fetch normalized conversations visible to this napplet.
 *
 * @param query  Optional cursor and limit
 * @returns Promise resolving to a page of conversations
 */
export function conversations(query: DmConversationQuery = {}): Promise<DmConversationPage> {
  const id = crypto.randomUUID();
  const promise = createPending(pendingConversations, id, 'dm.conversations');
  const msg: DmConversationsMessage = {
    type: 'dm.conversations',
    id,
    ...query,
  };
  postToShell(msg);
  return promise;
}

/**
 * Fetch normalized message history for one conversation.
 *
 * @param query  Conversation id plus optional cursor and limit
 * @returns Promise resolving to a page of messages
 */
export function messages(query: DmMessageQuery): Promise<DmMessagePage> {
  const id = crypto.randomUUID();
  const promise = createPending(pendingMessages, id, 'dm.messages');
  const msg: DmMessagesMessage = {
    type: 'dm.messages',
    id,
    ...query,
  };
  postToShell(msg);
  return promise;
}

/**
 * Ask the runtime to send a direct message.
 *
 * @param request  Recipients, content, and optional conversation/client ids
 * @returns Promise resolving to the normalized send result
 */
export function send(request: DmSendRequest): Promise<DmSendResult> {
  const id = crypto.randomUUID();
  const promise = createPending(pendingSend, id, 'dm.send');
  const msg: DmSendMessage = {
    type: 'dm.send',
    id,
    ...request,
  };
  postToShell(msg);
  return promise;
}

/**
 * Start live delivery for one conversation or all visible conversations.
 *
 * @param request  Optional conversation scope
 * @returns Promise resolving to the runtime subscription id
 */
export function subscribe(request: DmSubscribeRequest = {}): Promise<DmSubscription> {
  const id = crypto.randomUUID();
  const promise = createPending(pendingSubscribe, id, 'dm.subscribe');
  const msg: DmSubscribeMessage = {
    type: 'dm.subscribe',
    id,
    ...request,
  };
  postToShell(msg);
  return promise;
}

/**
 * Stop a live DM subscription.
 *
 * @param subscriptionId  Runtime subscription id from subscribe()
 * @returns Promise resolving to the runtime acknowledgement
 */
export function unsubscribe(subscriptionId: string): Promise<DmOk> {
  const id = crypto.randomUUID();
  const promise = createPending(pendingUnsubscribe, id, 'dm.unsubscribe');
  const msg: DmUnsubscribeMessage = {
    type: 'dm.unsubscribe',
    id,
    subscriptionId,
  };
  postToShell(msg);
  return promise;
}

/**
 * Register for shell-pushed `dm.message` deliveries.
 *
 * @param handler  Called with each message and its runtime subscription id
 * @returns A Subscription with `close()` to stop listening
 */
export function onMessage(
  handler: (message: DmMessage, subscriptionId: string) => void,
): Subscription {
  messageHandlers.add(handler);
  return {
    close(): void {
      messageHandlers.delete(handler);
    },
  };
}

/**
 * Install the DM shim. Registration-only -- DM operations are issued on demand.
 *
 * @returns cleanup function that clears pending requests and message handlers
 */
export function installDmShim(): () => void {
  if (installed) {
    return () => undefined;
  }
  installed = true;
  return () => {
    for (const pending of pendingStatus.values()) clearTimeout(pending.timeout);
    for (const pending of pendingConversations.values()) clearTimeout(pending.timeout);
    for (const pending of pendingMessages.values()) clearTimeout(pending.timeout);
    for (const pending of pendingSend.values()) clearTimeout(pending.timeout);
    for (const pending of pendingSubscribe.values()) clearTimeout(pending.timeout);
    for (const pending of pendingUnsubscribe.values()) clearTimeout(pending.timeout);
    pendingStatus.clear();
    pendingConversations.clear();
    pendingMessages.clear();
    pendingSend.clear();
    pendingSubscribe.clear();
    pendingUnsubscribe.clear();
    messageHandlers.clear();
    installed = false;
  };
}
