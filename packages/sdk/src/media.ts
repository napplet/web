/**
 * @napplet/sdk -- Media session and notification wrapper objects.
 *
 * @packageDocumentation
 */

import type { Subscription } from '@napplet/core';
import type {
  MediaSessionCreate,
  MediaSessionResult,
  MediaMetadata,
  MediaState,
  MediaAction,
} from '@napplet/nap/media';
import { requireDomain } from './require-napplet.js';

/**
 * Media session control: create sessions, report state and metadata,
 * declare capabilities, receive commands from the shell.
 *
 * @example
 * ```ts
 * import { media } from '@napplet/sdk';
 *
 * const { sessionId } = await media.createSession({
 *   owner: 'napplet',
 *   metadata: { title: 'My Song', artist: 'The Artist' },
 * });
 *
 * media.reportState(sessionId, { status: 'playing', position: 42.5 });
 * ```
 */
export const media = {
  /**
   * Create a new media session with the shell.
   * @param options  Ownership-aware session options
   * @returns The shell result with canonical sessionId and owner, or error
   */
  createSession(options: MediaSessionCreate): Promise<MediaSessionResult> {
    return requireDomain('media').createSession(options);
  },

  /**
   * Update metadata for an existing session.
   * @param sessionId  The session to update
   * @param metadata   Partial metadata fields to update
   */
  updateSession(sessionId: string, metadata: Partial<MediaMetadata>): void {
    requireDomain('media').updateSession(sessionId, metadata);
  },

  /**
   * Destroy a media session.
   * @param sessionId  The session to destroy
   */
  destroySession(sessionId: string): void {
    requireDomain('media').destroySession(sessionId);
  },

  /**
   * Report current playback state for a session.
   * @param sessionId  The session to report state for
   * @param state      Current playback state
   */
  reportState(sessionId: string, state: MediaState): void {
    requireDomain('media').reportState(sessionId, state);
  },

  /**
   * Declare which media actions the session currently supports.
   * @param sessionId  The session to update capabilities for
   * @param actions    Currently supported actions
   */
  reportCapabilities(sessionId: string, actions: MediaAction[]): void {
    requireDomain('media').reportCapabilities(sessionId, actions);
  },

  /**
   * Send a command to the current playback owner.
   * @param sessionId  The session to control
   * @param action     The media action to request
   * @param value      Optional value for seek/volume
   */
  sendCommand(sessionId: string, action: MediaAction, value?: number): void {
    requireDomain('media').sendCommand(sessionId, action, value);
  },

  /**
   * Listen for media commands from the shell.
   * @param sessionId  The session to listen for commands on
   * @param callback   Called with (action, value?) when a command is received
   * @returns A Subscription with `close()` to stop listening
   */
  onCommand(
    sessionId: string,
    callback: (action: MediaAction, value?: number) => void,
  ): Subscription {
    return requireDomain('media').onCommand(sessionId, callback);
  },

  /**
   * Listen for shell-reported playback state for shell-owned sessions.
   * @param sessionId  The session to listen for state on
   * @param callback   Called with playback state
   * @returns A Subscription with `close()` to stop listening
   */
  onState(
    sessionId: string,
    callback: (state: MediaState) => void,
  ): Subscription {
    return requireDomain('media').onState(sessionId, callback);
  },

  /**
   * Listen for shell-reported capabilities for shell-owned sessions.
   * @param sessionId  The session to listen for capabilities on
   * @param callback   Called with available actions
   * @returns A Subscription with `close()` to stop listening
   */
  onCapabilities(
    sessionId: string,
    callback: (actions: MediaAction[]) => void,
  ): Subscription {
    return requireDomain('media').onCapabilities(sessionId, callback);
  },

  /**
   * Listen for the shell's media control list.
   * @param sessionId  The session to associate controls with
   * @param callback   Called with the shell's supported controls
   * @returns A Subscription with `close()` to stop listening
   */
  onControls(
    sessionId: string,
    callback: (controls: MediaAction[]) => void,
  ): Subscription {
    return requireDomain('media').onControls(sessionId, callback);
  },
};

/**
 * Shell-rendered notifications: send notifications, set badge counts,
 * register channels, request permission, listen for user interaction.
 *
 * @example
 * ```ts
 * import { notify } from '@napplet/sdk';
 *
 * const { notificationId } = await notify.send({
 *   title: 'New message', body: 'Alice: hey!',
 * });
 *
 * notify.badge(3);
 * ```
 */
export const notify = {
  /**
   * Send a notification to the shell.
   * @param notification  Notification payload (title required)
   * @returns The shell-assigned notificationId
   */
  send(notification: {
    title: string;
    body?: string;
    icon?: string;
    actions?: { id: string; label: string }[];
    channel?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }): Promise<{ notificationId: string }> {
    return requireDomain('notify').send(notification);
  },

  /**
   * Dismiss a notification by ID.
   * @param notificationId  The notification to dismiss
   */
  dismiss(notificationId: string): void {
    requireDomain('notify').dismiss(notificationId);
  },

  /**
   * Set the badge count for this napplet. Pass 0 to clear.
   * @param count  Badge count
   */
  badge(count: number): void {
    requireDomain('notify').badge(count);
  },

  /**
   * Register a notification channel.
   * @param channel  Channel definition
   */
  registerChannel(channel: {
    channelId: string;
    label: string;
    description?: string;
    defaultPriority?: 'low' | 'normal' | 'high' | 'urgent';
  }): void {
    requireDomain('notify').registerChannel(channel);
  },

  /**
   * Request permission to send notifications.
   * @param channel  Optional channel to request permission for
   * @returns Whether permission was granted
   */
  requestPermission(channel?: string): Promise<{ granted: boolean }> {
    return requireDomain('notify').requestPermission(channel);
  },

  /**
   * Listen for action button clicks on notifications.
   * @param callback  Called with (notificationId, actionId)
   * @returns A Subscription with `close()` to stop listening
   */
  onAction(
    callback: (notificationId: string, actionId: string) => void,
  ): Subscription {
    return requireDomain('notify').onAction(callback);
  },

  /**
   * Listen for notification body clicks.
   * @param callback  Called with (notificationId)
   * @returns A Subscription with `close()` to stop listening
   */
  onClicked(
    callback: (notificationId: string) => void,
  ): Subscription {
    return requireDomain('notify').onClicked(callback);
  },

  /**
   * Listen for notification dismissals.
   * @param callback  Called with (notificationId, reason?)
   * @returns A Subscription with `close()` to stop listening
   */
  onDismissed(
    callback: (notificationId: string, reason?: string) => void,
  ): Subscription {
    return requireDomain('notify').onDismissed(callback);
  },

  /**
   * Listen for the shell's notification capability list.
   * @param callback  Called with supported controls
   * @returns A Subscription with `close()` to stop listening
   */
  onControls(
    callback: (controls: ('toasts' | 'badges' | 'actions' | 'channels' | 'system')[]) => void,
  ): Subscription {
    return requireDomain('notify').onControls(callback);
  },
};
