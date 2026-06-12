/**
 * @napplet/nap/notify -- Notification message types
 * for the JSON envelope wire protocol.
 *
 * Defines 11 message types for shell-rendered notifications:
 * - Napplet -> Shell: send, dismiss, badge, channel.register, permission.request
 * - Shell -> Napplet: send.result, permission.result, action, clicked, dismissed, controls
 *
 * All types form a discriminated union on the `type` field.
 * Notifications are always rendered by the shell, never by the napplet.
 */

import type { NappletMessage } from '@napplet/core';

/** The NAP domain name for notify messages. */
export const DOMAIN = 'notify' as const;

/**
 * Notification priority levels. The shell maps these to its own
 * urgency and presentation rules.
 *
 * | Priority | Behavior hint |
 * |----------|---------------|
 * | `low`    | Silent, notification center only |
 * | `normal` | Standard toast or notification |
 * | `high`   | Prominent display, may use sound |
 * | `urgent` | Immediate attention, may bypass DND |
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * An action button attached to a notification. Up to 3 per notification.
 *
 * @example
 * ```ts
 * const action: NotificationAction = { id: 'reply', label: 'Reply' };
 * ```
 */
export interface NotificationAction {
  /** Unique identifier for this action (scoped to the notification). */
  id: string;
  /** Human-readable label displayed on the action button. */
  label: string;
}

/**
 * A notification channel for per-category user control.
 * Channels let users mute or configure specific notification categories
 * independently (e.g., mute "promotions" but keep "messages").
 *
 * @example
 * ```ts
 * const channel: NotificationChannel = {
 *   channelId: 'messages',
 *   label: 'Messages',
 *   description: 'Direct messages and mentions',
 *   defaultPriority: 'normal',
 * };
 * ```
 */
export interface NotificationChannel {
  /** Unique identifier for the channel. */
  channelId: string;
  /** Human-readable label for the channel. */
  label: string;
  /** Optional description of what notifications this channel carries. */
  description?: string;
  /** Default priority for notifications in this channel. */
  defaultPriority?: NotificationPriority;
}

/**
 * Notification capabilities the shell supports.
 * The shell pushes this list so the napplet can adapt its behavior.
 */
export type NotifyControl = 'toasts' | 'badges' | 'actions' | 'channels' | 'system';

/**
 * Base interface for all notify NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface NotifyMessage extends NappletMessage {
  /** Message type in "notify.<action>" format. */
  type: `notify.${string}`;
}

/**
 * Send a notification to the shell. Uses `id` for correlation
 * with the result.
 *
 * @example
 * ```ts
 * const msg: NotifySendMessage = {
 *   type: 'notify.send',
 *   id: 'n1',
 *   title: 'New message',
 *   body: 'Alice: hey!',
 *   priority: 'normal',
 * };
 * ```
 */
export interface NotifySendMessage extends NotifyMessage {
  type: 'notify.send';
  /** Correlation ID for the request/result pair. */
  id: string;
  /** Notification title (required). */
  title: string;
  /** Optional notification body text. */
  body?: string;
  /** Optional icon URL or identifier. */
  icon?: string;
  /** Optional action buttons (up to 3). */
  actions?: NotificationAction[];
  /** Optional channel ID this notification belongs to. */
  channel?: string;
  /** Optional priority level. Defaults to 'normal' if omitted. */
  priority?: NotificationPriority;
}

/**
 * Dismiss a notification by ID. Fire-and-forget.
 *
 * @example
 * ```ts
 * const msg: NotifyDismissMessage = {
 *   type: 'notify.dismiss',
 *   notificationId: 'shell-42',
 * };
 * ```
 */
export interface NotifyDismissMessage extends NotifyMessage {
  type: 'notify.dismiss';
  /** The shell-assigned notification ID to dismiss. */
  notificationId: string;
}

/**
 * Set the badge count for this napplet. Fire-and-forget.
 * Pass `0` to clear.
 *
 * @example
 * ```ts
 * const msg: NotifyBadgeMessage = {
 *   type: 'notify.badge',
 *   count: 3,
 * };
 * ```
 */
export interface NotifyBadgeMessage extends NotifyMessage {
  type: 'notify.badge';
  /** Badge count. 0 clears the badge. */
  count: number;
}

/**
 * Register a notification channel. Fire-and-forget.
 * The shell MAY ignore channels it does not support.
 *
 * @example
 * ```ts
 * const msg: NotifyChannelRegisterMessage = {
 *   type: 'notify.channel.register',
 *   channelId: 'messages',
 *   label: 'Messages',
 *   description: 'Direct messages and mentions',
 *   defaultPriority: 'normal',
 * };
 * ```
 */
export interface NotifyChannelRegisterMessage extends NotifyMessage {
  type: 'notify.channel.register';
  /** Unique identifier for the channel. */
  channelId: string;
  /** Human-readable label for the channel. */
  label: string;
  /** Optional description. */
  description?: string;
  /** Default priority for notifications in this channel. */
  defaultPriority?: NotificationPriority;
}

/**
 * Request permission to send notifications. Uses `id` for correlation.
 * The shell MAY prompt the user asynchronously.
 *
 * @example
 * ```ts
 * const msg: NotifyPermissionRequestMessage = {
 *   type: 'notify.permission.request',
 *   id: 'p1',
 *   channel: 'messages',
 * };
 * ```
 */
export interface NotifyPermissionRequestMessage extends NotifyMessage {
  type: 'notify.permission.request';
  /** Correlation ID for the request/result pair. */
  id: string;
  /** Optional channel to request permission for. Omit for general permission. */
  channel?: string;
}

/**
 * Result of a notify.send request. Carries the same correlation `id`.
 *
 * @example
 * ```ts
 * const msg: NotifySendResultMessage = {
 *   type: 'notify.send.result',
 *   id: 'n1',
 *   notificationId: 'shell-42',
 * };
 * ```
 */
export interface NotifySendResultMessage extends NotifyMessage {
  type: 'notify.send.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Shell-assigned notification ID on success. Absent on error. */
  notificationId?: string;
  /** Error message on failure (e.g., "permission denied", "rate limited"). */
  error?: string;
}

/**
 * Result of a notify.permission.request. Carries the same correlation `id`.
 *
 * @example
 * ```ts
 * const msg: NotifyPermissionResultMessage = {
 *   type: 'notify.permission.result',
 *   id: 'p1',
 *   granted: true,
 * };
 * ```
 */
export interface NotifyPermissionResultMessage extends NotifyMessage {
  type: 'notify.permission.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Whether permission was granted. */
  granted: boolean;
}

/**
 * Shell-initiated: user clicked an action button on a notification.
 *
 * @example
 * ```ts
 * const msg: NotifyActionMessage = {
 *   type: 'notify.action',
 *   notificationId: 'shell-43',
 *   actionId: 'reply',
 * };
 * ```
 */
export interface NotifyActionMessage extends NotifyMessage {
  type: 'notify.action';
  /** The notification the action belongs to. */
  notificationId: string;
  /** The action that was clicked. */
  actionId: string;
}

/**
 * Shell-initiated: user clicked the notification body.
 *
 * @example
 * ```ts
 * const msg: NotifyClickedMessage = {
 *   type: 'notify.clicked',
 *   notificationId: 'shell-42',
 * };
 * ```
 */
export interface NotifyClickedMessage extends NotifyMessage {
  type: 'notify.clicked';
  /** The notification that was clicked. */
  notificationId: string;
}

/**
 * Shell-initiated: a notification was dismissed.
 * The `reason` field indicates why.
 *
 * @example
 * ```ts
 * const msg: NotifyDismissedMessage = {
 *   type: 'notify.dismissed',
 *   notificationId: 'shell-42',
 *   reason: 'timeout',
 * };
 * ```
 */
export interface NotifyDismissedMessage extends NotifyMessage {
  type: 'notify.dismissed';
  /** The notification that was dismissed. */
  notificationId: string;
  /** Why the notification was dismissed: 'user', 'timeout', or 'replaced'. */
  reason?: 'user' | 'timeout' | 'replaced';
}

/**
 * Shell-initiated push of the shell's supported notification capabilities.
 * The napplet can adapt its behavior based on what the shell supports.
 *
 * @example
 * ```ts
 * const msg: NotifyControlsMessage = {
 *   type: 'notify.controls',
 *   controls: ['toasts', 'badges', 'actions', 'channels'],
 * };
 * ```
 */
export interface NotifyControlsMessage extends NotifyMessage {
  type: 'notify.controls';
  /** Notification capabilities the shell supports. */
  controls: NotifyControl[];
}

/** Napplet -> Shell notify request messages. */
export type NotifyRequestMessage =
  | NotifySendMessage
  | NotifyDismissMessage
  | NotifyBadgeMessage
  | NotifyChannelRegisterMessage
  | NotifyPermissionRequestMessage;

/** Shell -> Napplet notify result/push messages. */
export type NotifyResultMessage =
  | NotifySendResultMessage
  | NotifyPermissionResultMessage
  | NotifyActionMessage
  | NotifyClickedMessage
  | NotifyDismissedMessage
  | NotifyControlsMessage;

/** All notify NAP message types (discriminated union on `type` field). */
export type NotifyNapMessage = NotifyRequestMessage | NotifyResultMessage;
