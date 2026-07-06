/**
 * @napplet/nap/dm -- Runtime-mediated direct message types for NAP-DM.
 *
 * The runtime owns signing, encryption, relay routing, storage, key/session
 * state, and policy. Napplets receive normalized conversations and messages.
 */

import type {
  DmConversationPage,
  DmConversationQuery,
  DmMessage,
  DmMessagePage,
  DmMessageQuery,
  DmOk,
  DmError,
  DmSendRequest,
  DmSendResult,
  DmStatus,
  DmSubscribeRequest,
  DmSubscription,
  NappletMessage,
} from '@napplet/core';

/** The NAP domain name for direct message operations. */
export const DOMAIN = 'dm' as const;

export type {
  DmConversation,
  DmConversationPage,
  DmConversationQuery,
  DmHexPubkey,
  DmMessage,
  DmMessagePage,
  DmMessageQuery,
  DmMessageStatus,
  DmOk,
  DmError,
  DmPeer,
  DmSendRequest,
  DmSendResult,
  DmStatus,
  DmSubscribeRequest,
  DmSubscription,
  DmTimestamp,
} from '@napplet/core';

/** Base interface for all DM NAP messages. */
export interface DmMessageEnvelope extends NappletMessage {
  /** Message type in "dm.<action>" format. */
  type: `dm.${string}`;
}

type DmResultError<TSuccess extends object> =
  & DmError
  & { [K in keyof TSuccess]?: undefined };

type DmResultMessage<TEnvelope extends DmMessageEnvelope, TSuccess extends object> =
  | (TEnvelope & TSuccess & { error?: undefined })
  | (TEnvelope & DmResultError<TSuccess>);

/** Request current DM availability. */
export interface DmStatusMessage extends DmMessageEnvelope {
  type: 'dm.status';
  id: string;
}

/** Result of `dm.status`. */
interface DmStatusResultEnvelope extends DmMessageEnvelope {
  type: 'dm.status.result';
  id: string;
}

export type DmStatusResultMessage = DmResultMessage<DmStatusResultEnvelope, DmStatus>;

/** Request normalized DM conversations. */
export interface DmConversationsMessage extends DmMessageEnvelope, DmConversationQuery {
  type: 'dm.conversations';
  id: string;
}

/** Result of `dm.conversations`. */
interface DmConversationsResultEnvelope extends DmMessageEnvelope {
  type: 'dm.conversations.result';
  id: string;
}

export type DmConversationsResultMessage =
  DmResultMessage<DmConversationsResultEnvelope, DmConversationPage>;

/** Request message history for one conversation. */
export interface DmMessagesMessage extends DmMessageEnvelope, DmMessageQuery {
  type: 'dm.messages';
  id: string;
}

/** Result of `dm.messages`. */
interface DmMessagesResultEnvelope extends DmMessageEnvelope {
  type: 'dm.messages.result';
  id: string;
}

export type DmMessagesResultMessage = DmResultMessage<DmMessagesResultEnvelope, DmMessagePage>;

/** Ask the runtime to send a direct message. */
export interface DmSendMessage extends DmMessageEnvelope, DmSendRequest {
  type: 'dm.send';
  id: string;
}

/** Result of `dm.send`. */
interface DmSendResultEnvelope extends DmMessageEnvelope {
  type: 'dm.send.result';
  id: string;
}

export type DmSendResultMessage = DmResultMessage<DmSendResultEnvelope, DmSendResult>;

/** Request live DM delivery. */
export interface DmSubscribeMessage extends DmMessageEnvelope, DmSubscribeRequest {
  type: 'dm.subscribe';
  id: string;
}

/** Result of `dm.subscribe`. */
interface DmSubscribeResultEnvelope extends DmMessageEnvelope {
  type: 'dm.subscribe.result';
  id: string;
}

export type DmSubscribeResultMessage =
  DmResultMessage<DmSubscribeResultEnvelope, DmSubscription>;

/** Stop live DM delivery. */
export interface DmUnsubscribeMessage extends DmMessageEnvelope {
  type: 'dm.unsubscribe';
  id: string;
  subscriptionId: string;
}

/** Result of `dm.unsubscribe`. */
interface DmUnsubscribeResultEnvelope extends DmMessageEnvelope {
  type: 'dm.unsubscribe.result';
  id: string;
}

export type DmUnsubscribeResultMessage = DmResultMessage<DmUnsubscribeResultEnvelope, DmOk>;

/** Shell-pushed live DM message. */
export interface DmMessageEventMessage extends DmMessageEnvelope {
  type: 'dm.message';
  subscriptionId: string;
  message: DmMessage;
}

/** Napplet -> Shell DM messages. */
export type DmOutboundMessage =
  | DmStatusMessage
  | DmConversationsMessage
  | DmMessagesMessage
  | DmSendMessage
  | DmSubscribeMessage
  | DmUnsubscribeMessage;

/** Shell -> Napplet DM messages. */
export type DmInboundMessage =
  | DmStatusResultMessage
  | DmConversationsResultMessage
  | DmMessagesResultMessage
  | DmSendResultMessage
  | DmSubscribeResultMessage
  | DmUnsubscribeResultMessage
  | DmMessageEventMessage;

/** All DM NAP message types. */
export type DmNapMessage = DmOutboundMessage | DmInboundMessage;
