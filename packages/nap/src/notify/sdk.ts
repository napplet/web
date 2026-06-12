/**
 * @napplet/nap/notify -- SDK helpers wrapping window.napplet.notify.
 *
 * These convenience functions delegate to `window.napplet.notify.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { Subscription } from '@napplet/core';
import type { NotificationAction, NotificationPriority, NotifyControl } from './types.js';

interface NotifyApi {
  send(notification: {
    title: string;
    body?: string;
    icon?: string;
    actions?: NotificationAction[];
    channel?: string;
    priority?: NotificationPriority;
  }): Promise<{ notificationId: string }>;
  dismiss(notificationId: string): void;
  badge(count: number): void;
  registerChannel(channel: {
    channelId: string;
    label: string;
    description?: string;
    defaultPriority?: NotificationPriority;
  }): void;
  requestPermission(channel?: string): Promise<{ granted: boolean }>;
  onAction(callback: (notificationId: string, actionId: string) => void): Subscription;
  onClicked(callback: (notificationId: string) => void): Subscription;
  onDismissed(callback: (notificationId: string, reason?: string) => void): Subscription;
  onControls(callback: (controls: NotifyControl[]) => void): Subscription;
}

function requireNotify(): NotifyApi {
  const w = window as Window & { napplet?: { notify?: NotifyApi } };
  if (!w.napplet?.notify) {
    throw new Error('window.napplet.notify not installed -- import @napplet/shim first');
  }
  return w.napplet.notify;
}

/**
 * Send a notification to the shell.
 *
 * @param notification  The notification payload
 * @returns The confirmed notification result with notificationId
 *
 * @example
 * ```ts
 * import { notifySend } from '@napplet/nap/notify';
 *
 * const { notificationId } = await notifySend({
 *   title: 'New message',
 *   body: 'Alice: hey!',
 *   priority: 'normal',
 * });
 * ```
 */
export function notifySend(notification: {
  title: string;
  body?: string;
  icon?: string;
  actions?: NotificationAction[];
  channel?: string;
  priority?: NotificationPriority;
}): Promise<{ notificationId: string }> {
  return requireNotify().send(notification);
}

/**
 * Dismiss a notification by ID.
 *
 * @param notificationId  The notification to dismiss
 *
 * @example
 * ```ts
 * import { notifyDismiss } from '@napplet/nap/notify';
 *
 * notifyDismiss('shell-42');
 * ```
 */
export function notifyDismiss(notificationId: string): void {
  requireNotify().dismiss(notificationId);
}

/**
 * Set the badge count for this napplet.
 *
 * @param count  The badge count (0 to clear)
 *
 * @example
 * ```ts
 * import { notifyBadge } from '@napplet/nap/notify';
 *
 * notifyBadge(3);   // set badge to 3
 * notifyBadge(0);   // clear badge
 * ```
 */
export function notifyBadge(count: number): void {
  requireNotify().badge(count);
}

/**
 * Register a notification channel.
 *
 * @param channel  The channel to register
 *
 * @example
 * ```ts
 * import { notifyRegisterChannel } from '@napplet/nap/notify';
 *
 * notifyRegisterChannel({
 *   channelId: 'messages',
 *   label: 'Messages',
 *   description: 'Direct messages and mentions',
 * });
 * ```
 */
export function notifyRegisterChannel(channel: {
  channelId: string;
  label: string;
  description?: string;
  defaultPriority?: NotificationPriority;
}): void {
  requireNotify().registerChannel(channel);
}

/**
 * Request permission to send notifications.
 *
 * @param channel  Optional channel to request permission for
 * @returns Whether permission was granted
 *
 * @example
 * ```ts
 * import { notifyRequestPermission } from '@napplet/nap/notify';
 *
 * const { granted } = await notifyRequestPermission('messages');
 * if (granted) {
 *   // can send notifications on 'messages' channel
 * }
 * ```
 */
export function notifyRequestPermission(channel?: string): Promise<{ granted: boolean }> {
  return requireNotify().requestPermission(channel);
}

/**
 * Listen for action button clicks on notifications.
 *
 * @param callback  Called with (notificationId, actionId) when an action is clicked
 * @returns A Subscription with `close()` to stop listening
 *
 * @example
 * ```ts
 * import { notifyOnAction } from '@napplet/nap/notify';
 *
 * const sub = notifyOnAction((notificationId, actionId) => {
 *   if (actionId === 'reply') openReplyDialog(notificationId);
 * });
 * // Later: sub.close();
 * ```
 */
export function notifyOnAction(
  callback: (notificationId: string, actionId: string) => void,
): Subscription {
  return requireNotify().onAction(callback);
}

/**
 * Listen for notification body clicks.
 *
 * @param callback  Called with (notificationId) when a notification is clicked
 * @returns A Subscription with `close()` to stop listening
 *
 * @example
 * ```ts
 * import { notifyOnClicked } from '@napplet/nap/notify';
 *
 * const sub = notifyOnClicked((notificationId) => {
 *   focusConversation(notificationId);
 * });
 * // Later: sub.close();
 * ```
 */
export function notifyOnClicked(
  callback: (notificationId: string) => void,
): Subscription {
  return requireNotify().onClicked(callback);
}

/**
 * Listen for notification dismissals.
 *
 * @param callback  Called with (notificationId, reason?) when dismissed
 * @returns A Subscription with `close()` to stop listening
 *
 * @example
 * ```ts
 * import { notifyOnDismissed } from '@napplet/nap/notify';
 *
 * const sub = notifyOnDismissed((notificationId, reason) => {
 *   if (reason === 'user') markAsRead(notificationId);
 * });
 * // Later: sub.close();
 * ```
 */
export function notifyOnDismissed(
  callback: (notificationId: string, reason?: string) => void,
): Subscription {
  return requireNotify().onDismissed(callback);
}

/**
 * Listen for the shell's notification capability list.
 *
 * @param callback  Called with the shell's supported controls
 * @returns A Subscription with `close()` to stop listening
 *
 * @example
 * ```ts
 * import { notifyOnControls } from '@napplet/nap/notify';
 *
 * const sub = notifyOnControls((controls) => {
 *   canUseBadges = controls.includes('badges');
 * });
 * // Later: sub.close();
 * ```
 */
export function notifyOnControls(
  callback: (controls: NotifyControl[]) => void,
): Subscription {
  return requireNotify().onControls(callback);
}
