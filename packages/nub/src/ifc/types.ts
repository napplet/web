/**
 * @napplet/nub/ifc -- Inter-frame communication message types for the JSON envelope wire protocol.
 *
 * Defines 14 message types for two IFC modes:
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

// ─── Domain Constants ──────────────────────────────────────────────────────

/** The NUB domain name for inter-frame communication messages. */
export const DOMAIN = 'ifc' as const;

// ─── Base Message Type ─────────────────────────────────────────────────────

/**
 * Base interface for all IFC NUB messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface IfcMessage extends NappletMessage {
  /** Message type in "ifc.<action>" format. */
  type: `ifc.${string}`;
}

// ─── Topic Pub/Sub Messages ────────────────────────────────────────────────

/**
 * Emit a fire-and-forget message on a topic.
 * No `id` field -- this is fire-and-forget with no response.
 * ACL is checked per-message by the shell.
 *
 * @example
 * ```ts
 * const msg: IfcEmitMessage = {
 *   type: 'ifc.emit',
 *   topic: 'profile:open',
 *   payload: { pubkey: 'abc123...' },
 * };
 * ```
 */
export interface IfcEmitMessage extends IfcMessage {
  type: 'ifc.emit';
  /** Topic string for the message. */
  topic: string;
  /** Optional payload data. */
  payload?: unknown;
}

/**
 * Subscribe to a topic to receive events.
 */
export interface IfcSubscribeMessage extends IfcMessage {
  type: 'ifc.subscribe';
  /** Correlation ID. */
  id: string;
  /** Topic to subscribe to. */
  topic: string;
}

/**
 * Result of an ifc.subscribe request.
 */
export interface IfcSubscribeResultMessage extends IfcMessage {
  type: 'ifc.subscribe.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Error message if subscription failed. */
  error?: string;
}

/**
 * Unsubscribe from a topic.
 */
export interface IfcUnsubscribeMessage extends IfcMessage {
  type: 'ifc.unsubscribe';
  /** Topic to unsubscribe from. */
  topic: string;
}

/**
 * An event received on a subscribed topic.
 * Delivered by the shell when another napplet emits on this topic.
 */
export interface IfcEventMessage extends IfcMessage {
  type: 'ifc.event';
  /** Topic the event was emitted on. */
  topic: string;
  /** Identity of the sending napplet. */
  sender: string;
  /** Optional payload data. */
  payload?: unknown;
}

// ─── Channel Messages ──────────────────────────────────────────────────────

/**
 * Open a point-to-point channel with a target napplet.
 * ACL is checked at open time only -- subsequent messages on the channel are not re-checked.
 */
export interface IfcChannelOpenMessage extends IfcMessage {
  type: 'ifc.channel.open';
  /** Correlation ID. */
  id: string;
  /** Target napplet identifier. */
  target: string;
}

/**
 * Result of an ifc.channel.open request.
 */
export interface IfcChannelOpenResultMessage extends IfcMessage {
  type: 'ifc.channel.open.result';
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
export interface IfcChannelEmitMessage extends IfcMessage {
  type: 'ifc.channel.emit';
  /** Opaque channel identifier. */
  channelId: string;
  /** Optional payload data. */
  payload?: unknown;
}

/**
 * An event received on an open channel.
 */
export interface IfcChannelEventMessage extends IfcMessage {
  type: 'ifc.channel.event';
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
export interface IfcChannelBroadcastMessage extends IfcMessage {
  type: 'ifc.channel.broadcast';
  /** Optional payload data. */
  payload?: unknown;
}

/**
 * List all open channels for this napplet.
 */
export interface IfcChannelListMessage extends IfcMessage {
  type: 'ifc.channel.list';
  /** Correlation ID. */
  id: string;
}

/**
 * Result of an ifc.channel.list request.
 */
export interface IfcChannelListResultMessage extends IfcMessage {
  type: 'ifc.channel.list.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Array of open channels with their IDs and peer identities. */
  channels: Array<{ id: string; peer: string }>;
}

/**
 * Close an open channel.
 */
export interface IfcChannelCloseMessage extends IfcMessage {
  type: 'ifc.channel.close';
  /** Opaque channel identifier to close. */
  channelId: string;
}

/**
 * Notification that a channel was closed.
 */
export interface IfcChannelClosedMessage extends IfcMessage {
  type: 'ifc.channel.closed';
  /** Opaque channel identifier that was closed. */
  channelId: string;
  /** Optional reason for closure. */
  reason?: string;
}

// ─── Discriminated Unions ──────────────────────────────────────────────────

/** Topic pub/sub messages (dispatch mode). */
export type IfcTopicMessage =
  | IfcEmitMessage
  | IfcSubscribeMessage
  | IfcSubscribeResultMessage
  | IfcUnsubscribeMessage
  | IfcEventMessage;

/** Channel messages (point-to-point mode). */
export type IfcChannelMessage =
  | IfcChannelOpenMessage
  | IfcChannelOpenResultMessage
  | IfcChannelEmitMessage
  | IfcChannelEventMessage
  | IfcChannelBroadcastMessage
  | IfcChannelListMessage
  | IfcChannelListResultMessage
  | IfcChannelCloseMessage
  | IfcChannelClosedMessage;

/** Napplet -> Shell IFC messages (outbound). */
export type IfcOutboundMessage =
  | IfcEmitMessage
  | IfcSubscribeMessage
  | IfcUnsubscribeMessage
  | IfcChannelOpenMessage
  | IfcChannelEmitMessage
  | IfcChannelBroadcastMessage
  | IfcChannelListMessage
  | IfcChannelCloseMessage;

/** Shell -> Napplet IFC messages (inbound). */
export type IfcInboundMessage =
  | IfcSubscribeResultMessage
  | IfcEventMessage
  | IfcChannelOpenResultMessage
  | IfcChannelEventMessage
  | IfcChannelListResultMessage
  | IfcChannelClosedMessage;

/** All IFC NUB message types (discriminated union on `type` field). */
export type IfcNubMessage = IfcTopicMessage | IfcChannelMessage;
