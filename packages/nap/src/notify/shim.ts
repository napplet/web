/**
 * Napplet NAP notify shim entrypoint.
 *
 * @module
 */

// @napplet/nap/notify -- Notify NAP shim (notification sending + interaction handlers)
// Manages notification sending, permission flow, badge counts, and shell interaction callbacks.

import { postToShell } from '../boundary.js';
import type {
  NotificationAction,
  NotificationPriority,
  NotifySendMessage,
  NotifyDismissMessage,
  NotifyBadgeMessage,
  NotifyChannelRegisterMessage,
  NotifyPermissionRequestMessage,
  NotifySendResultMessage,
  NotifyPermissionResultMessage,
  NotifyActionMessage,
  NotifyClickedMessage,
  NotifyDismissedMessage,
  NotifyControlsMessage,
  NotifyControl,
} from './types.js';
import type { Subscription } from '@napplet/core';

/** Default timeout for correlated requests (30 seconds). */
const REQUEST_TIMEOUT_MS = 30_000;

/** Pending send requests: correlation id -> { resolve, reject }. */
const pendingSends = new Map<string, {
  resolve: (value: { notificationId: string }) => void;
  reject: (reason: Error) => void;
}>();

/** Pending permission requests: correlation id -> { resolve, reject }. */
const pendingPermissions = new Map<string, {
  resolve: (value: { granted: boolean }) => void;
  reject: (reason: Error) => void;
}>();

/** Action handlers: Set of callbacks for notify.action messages. */
const actionHandlers = new Set<(notificationId: string, actionId: string) => void>();

/** Clicked handlers: Set of callbacks for notify.clicked messages. */
const clickedHandlers = new Set<(notificationId: string) => void>();

/** Dismissed handlers: Set of callbacks for notify.dismissed messages. */
const dismissedHandlers = new Set<(notificationId: string, reason?: string) => void>();

/** Controls handlers: Set of callbacks for notify.controls messages. */
const controlsHandlers = new Set<(controls: NotifyControl[]) => void>();

/** Guard against double-install. */
let installed = false;

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

/**
 * Handle notify.send.result from the shell.
 * Resolves the pending send promise.
 */
function handleSendResult(msg: NotifySendResultMessage): void {
  const pending = pendingSends.get(msg.id);
  if (!pending) return;
  pendingSends.delete(msg.id);

  if (msg.error) {
    pending.reject(new Error(msg.error));
    return;
  }

  if (msg.notificationId) {
    pending.resolve({ notificationId: msg.notificationId });
  } else {
    pending.reject(new Error('notify.send.result missing notificationId'));
  }
}

/**
 * Handle notify.permission.result from the shell.
 * Resolves the pending permission promise.
 */
function handlePermissionResult(msg: NotifyPermissionResultMessage): void {
  const pending = pendingPermissions.get(msg.id);
  if (!pending) return;
  pendingPermissions.delete(msg.id);

  pending.resolve({ granted: msg.granted });
}

/**
 * Handle notify.action from the shell.
 * Dispatches to registered action handlers.
 */
function handleAction(msg: NotifyActionMessage): void {
  for (const cb of actionHandlers) {
    cb(msg.notificationId, msg.actionId);
  }
}

/**
 * Handle notify.clicked from the shell.
 * Dispatches to registered clicked handlers.
 */
function handleClicked(msg: NotifyClickedMessage): void {
  for (const cb of clickedHandlers) {
    cb(msg.notificationId);
  }
}

/**
 * Handle notify.dismissed from the shell.
 * Dispatches to registered dismissed handlers.
 */
function handleDismissed(msg: NotifyDismissedMessage): void {
  for (const cb of dismissedHandlers) {
    cb(msg.notificationId, msg.reason);
  }
}

/**
 * Handle notify.controls from the shell.
 * Dispatches to registered controls handlers.
 */
function handleControls(msg: NotifyControlsMessage): void {
  for (const cb of controlsHandlers) {
    cb(msg.controls);
  }
}

/**
 * Handle notify.* messages from the shell via the central message listener.
 */
export function handleNotifyMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<NotifySendResultMessage>(msg, 'notify.send.result')) {
    handleSendResult(msg);
  } else if (isMessageType<NotifyPermissionResultMessage>(msg, 'notify.permission.result')) {
    handlePermissionResult(msg);
  } else if (isMessageType<NotifyActionMessage>(msg, 'notify.action')) {
    handleAction(msg);
  } else if (isMessageType<NotifyClickedMessage>(msg, 'notify.clicked')) {
    handleClicked(msg);
  } else if (isMessageType<NotifyDismissedMessage>(msg, 'notify.dismissed')) {
    handleDismissed(msg);
  } else if (isMessageType<NotifyControlsMessage>(msg, 'notify.controls')) {
    handleControls(msg);
  }
}

/**
 * Send a notification to the shell.
 * Returns the shell-assigned notification ID on success.
 *
 * @param notification  The notification payload (title required, others optional)
 * @returns The confirmed notification result with notificationId
 */
export function send(notification: {
  title: string;
  body?: string;
  icon?: string;
  actions?: NotificationAction[];
  channel?: string;
  priority?: NotificationPriority;
}): Promise<{ notificationId: string }> {
  const id = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    pendingSends.set(id, { resolve, reject });

    const msg: NotifySendMessage = {
      type: 'notify.send',
      id,
      ...notification,
    };
    postToShell(msg);

    setTimeout(() => {
      if (pendingSends.delete(id)) {
        reject(new Error('notify.send timed out'));
      }
    }, REQUEST_TIMEOUT_MS);
  });
}

/**
 * Dismiss a notification by ID. Fire-and-forget.
 *
 * @param notificationId  The shell-assigned notification ID to dismiss
 */
export function dismiss(notificationId: string): void {
  const msg: NotifyDismissMessage = {
    type: 'notify.dismiss',
    notificationId,
  };
  postToShell(msg);
}

/**
 * Set the badge count for this napplet. Fire-and-forget.
 * Pass `0` to clear the badge.
 *
 * @param count  The badge count (0 to clear)
 */
export function badge(count: number): void {
  const msg: NotifyBadgeMessage = {
    type: 'notify.badge',
    count,
  };
  postToShell(msg);
}

/**
 * Register a notification channel. Fire-and-forget.
 * Channels let users control notification categories independently.
 *
 * @param channel  The channel to register
 */
export function registerChannel(channel: {
  channelId: string;
  label: string;
  description?: string;
  defaultPriority?: NotificationPriority;
}): void {
  const msg: NotifyChannelRegisterMessage = {
    type: 'notify.channel.register',
    ...channel,
  };
  postToShell(msg);
}

/**
 * Request permission to send notifications.
 * The shell MAY prompt the user asynchronously.
 *
 * @param channel  Optional channel to request permission for
 * @returns Whether permission was granted
 */
export function requestPermission(channel?: string): Promise<{ granted: boolean }> {
  const id = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    pendingPermissions.set(id, { resolve, reject });

    const msg: NotifyPermissionRequestMessage = {
      type: 'notify.permission.request',
      id,
      channel,
    };
    postToShell(msg);

    setTimeout(() => {
      if (pendingPermissions.delete(id)) {
        reject(new Error('notify.permission.request timed out'));
      }
    }, REQUEST_TIMEOUT_MS);
  });
}

/**
 * Listen for action button clicks on notifications.
 * Returns a Subscription with close() to stop listening.
 *
 * @param callback  Called with (notificationId, actionId) when an action is clicked
 * @returns A Subscription with `close()` to unsubscribe
 */
export function onAction(
  callback: (notificationId: string, actionId: string) => void,
): Subscription {
  actionHandlers.add(callback);

  return {
    close(): void {
      actionHandlers.delete(callback);
    },
  };
}

/**
 * Listen for notification body clicks.
 * Returns a Subscription with close() to stop listening.
 *
 * @param callback  Called with (notificationId) when a notification is clicked
 * @returns A Subscription with `close()` to unsubscribe
 */
export function onClicked(
  callback: (notificationId: string) => void,
): Subscription {
  clickedHandlers.add(callback);

  return {
    close(): void {
      clickedHandlers.delete(callback);
    },
  };
}

/**
 * Listen for notification dismissals.
 * Returns a Subscription with close() to stop listening.
 *
 * @param callback  Called with (notificationId, reason?) when a notification is dismissed
 * @returns A Subscription with `close()` to unsubscribe
 */
export function onDismissed(
  callback: (notificationId: string, reason?: string) => void,
): Subscription {
  dismissedHandlers.add(callback);

  return {
    close(): void {
      dismissedHandlers.delete(callback);
    },
  };
}

/**
 * Listen for the shell's notification capability list.
 * Returns a Subscription with close() to stop listening.
 *
 * @param callback  Called with the shell's supported notification controls
 * @returns A Subscription with `close()` to unsubscribe
 */
export function onControls(
  callback: (controls: NotifyControl[]) => void,
): Subscription {
  controlsHandlers.add(callback);

  return {
    close(): void {
      controlsHandlers.delete(callback);
    },
  };
}

/**
 * Install the notify shim. Currently a no-op placeholder --
 * notifications are sent on demand, not at install time.
 *
 * @returns cleanup function that clears all state
 */
export function installNotifyShim(): () => void {
  if (installed) {
    return () => undefined; // already installed: no-op cleanup
  }

  installed = true;

  return () => {
    pendingSends.clear();
    pendingPermissions.clear();
    actionHandlers.clear();
    clickedHandlers.clear();
    dismissedHandlers.clear();
    controlsHandlers.clear();
    installed = false;
  };
}
