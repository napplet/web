/**
 * Napplet NAP inc types entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/inc -- Inter-napplet communication message types for the JSON envelope wire protocol.
 *
 * Defines 14 message types for two INC modes:
 *
 * ## Topic Pub/Sub (Dispatch Mode)
 * Fire-and-forget messaging with per-message ACL checks.
 * - emit (no id -- fire-and-forget), subscribe, subscribe.result, unsubscribe, event
 *
 * ## Channel Mode
 * Point-to-point channels with ACL checked at open time only.
 * - channel.open, channel.open.result, channel.emit, channel.event,
 *   channel.broadcast, channel.list, channel.list.result, channel.close, channel.closed
 *
 * All types form a discriminated union on the `type` field.
 */

import type { NappletMessage } from '@napplet/core';

/** The NAP domain name for inter-napplet communication messages. */
export const DOMAIN = 'inc' as const;

/**
 * Base interface for all INC NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface IncMessage extends NappletMessage {
  /** Message type in "inc.<action>" format. */
  type: `inc.${string}`;
}

/**
 * Emit a fire-and-forget message on a topic.
 * No `id` field -- this is fire-and-forget with no response.
 * ACL is checked per-message by the shell.
 *
 * @example
 * ```ts
 * const msg: IncEmitMessage = {
 *   type: 'inc.emit',
 *   topic: 'profile:open',
 *   payload: { pubkey: 'abc123...' },
 * };
 * ```
 */
export interface IncEmitMessage extends IncMessage {
  type: 'inc.emit';
  /** Topic string for the message. */
  topic: string;
  /** Optional payload data. */
  payload?: unknown;
}

/**
 * Subscribe to a topic to receive events.
 */
export interface IncSubscribeMessage extends IncMessage {
  type: 'inc.subscribe';
  /** Correlation ID. */
  id: string;
  /** Topic to subscribe to. */
  topic: string;
}

/**
 * Result of an inc.subscribe request.
 */
export interface IncSubscribeResultMessage extends IncMessage {
  type: 'inc.subscribe.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Error message if subscription failed. */
  error?: string;
}

/**
 * Unsubscribe from a topic.
 */
export interface IncUnsubscribeMessage extends IncMessage {
  type: 'inc.unsubscribe';
  /** Topic to unsubscribe from. */
  topic: string;
}

/**
 * An event received on a subscribed topic.
 * Delivered by the shell when another napplet emits on this topic.
 */
export interface IncEventMessage extends IncMessage {
  type: 'inc.event';
  /** Topic the event was emitted on. */
  topic: string;
  /** Identity of the sending napplet. */
  sender: string;
  /** Optional payload data. */
  payload?: unknown;
}

/**
 * Open a point-to-point channel with a target napplet.
 * ACL is checked at open time only -- subsequent messages on the channel are not re-checked.
 */
export interface IncChannelOpenMessage extends IncMessage {
  type: 'inc.channel.open';
  /** Correlation ID. */
  id: string;
  /** Target napplet identifier. */
  target: string;
}

/**
 * Result of an inc.channel.open request.
 */
export interface IncChannelOpenResultMessage extends IncMessage {
  type: 'inc.channel.open.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Opaque channel identifier (present on success). */
  channelId?: string;
  /** Identity of the peer napplet. */
  peer?: string;
  /** Error message if channel open failed. */
  error?: string;
}

/**
 * Send a message on an open channel.
 * Sender exclusion: the sending napplet does not receive its own message.
 */
export interface IncChannelEmitMessage extends IncMessage {
  type: 'inc.channel.emit';
  /** Opaque channel identifier. */
  channelId: string;
  /** Optional payload data. */
  payload?: unknown;
}

/**
 * An event received on an open channel.
 */
export interface IncChannelEventMessage extends IncMessage {
  type: 'inc.channel.event';
  /** Opaque channel identifier. */
  channelId: string;
  /** Identity of the sending napplet. */
  sender: string;
  /** Optional payload data. */
  payload?: unknown;
}

/**
 * Broadcast a message to all open channels.
 */
export interface IncChannelBroadcastMessage extends IncMessage {
  type: 'inc.channel.broadcast';
  /** Optional payload data. */
  payload?: unknown;
}

/**
 * List all open channels for this napplet.
 */
export interface IncChannelListMessage extends IncMessage {
  type: 'inc.channel.list';
  /** Correlation ID. */
  id: string;
}

/**
 * Result of an inc.channel.list request.
 */
export interface IncChannelListResultMessage extends IncMessage {
  type: 'inc.channel.list.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Array of open channels with their IDs and peer identities. */
  channels: Array<{ id: string; peer: string }>;
}

/**
 * Close an open channel.
 */
export interface IncChannelCloseMessage extends IncMessage {
  type: 'inc.channel.close';
  /** Opaque channel identifier to close. */
  channelId: string;
}

/**
 * Notification that a channel was closed.
 */
export interface IncChannelClosedMessage extends IncMessage {
  type: 'inc.channel.closed';
  /** Opaque channel identifier that was closed. */
  channelId: string;
  /** Optional reason for closure. */
  reason?: string;
}

/** Topic pub/sub messages (dispatch mode). */
export type IncTopicMessage =
  | IncEmitMessage
  | IncSubscribeMessage
  | IncSubscribeResultMessage
  | IncUnsubscribeMessage
  | IncEventMessage;

/** Channel messages (point-to-point mode). */
export type IncChannelMessage =
  | IncChannelOpenMessage
  | IncChannelOpenResultMessage
  | IncChannelEmitMessage
  | IncChannelEventMessage
  | IncChannelBroadcastMessage
  | IncChannelListMessage
  | IncChannelListResultMessage
  | IncChannelCloseMessage
  | IncChannelClosedMessage;

/** Napplet -> Shell INC messages (outbound). */
export type IncOutboundMessage =
  | IncEmitMessage
  | IncSubscribeMessage
  | IncUnsubscribeMessage
  | IncChannelOpenMessage
  | IncChannelEmitMessage
  | IncChannelBroadcastMessage
  | IncChannelListMessage
  | IncChannelCloseMessage;

/** Shell -> Napplet INC messages (inbound). */
export type IncInboundMessage =
  | IncSubscribeResultMessage
  | IncEventMessage
  | IncChannelOpenResultMessage
  | IncChannelEventMessage
  | IncChannelListResultMessage
  | IncChannelClosedMessage;

/** All INC NAP message types (discriminated union on `type` field). */
export type IncNapMessage = IncTopicMessage | IncChannelMessage;
