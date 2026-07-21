import type { Subscription } from '../nostr.js';
import type {
  MediaAction,
  MediaMetadata,
  MediaSessionCreate,
  MediaSessionResult,
  MediaState,
} from '../media.js';

/**
 * Media session control: create sessions, report state and metadata,
 * declare capabilities, receive commands from the shell.
 *
 * @example
 * ```ts
 * // Create a media session:
 * const { sessionId } = await window.napplet.media.createSession({
 *   owner: 'napplet',
 *   metadata: { title: 'My Song', artist: 'The Artist' },
 * });
 *
 * // Report playback state:
 * window.napplet.media.reportState(sessionId, {
 *   status: 'playing', position: 42.5, duration: 240,
 * });
 *
 * // Listen for shell commands:
 * window.napplet.media.onCommand(sessionId, (action, value) => {
 *   if (action === 'pause') player.pause();
 * });
 * ```
 */
export interface MediaApi {
  /**
   * Create a new media session with the shell.
   * @param options  Ownership-aware session options.
   * @returns The shell result with canonical sessionId and owner, or error.
   */
  createSession(options: MediaSessionCreate): Promise<MediaSessionResult>;
  /**
   * Update metadata for an existing session. Partial updates supported.
   * @param sessionId  The session to update
   * @param metadata   Partial metadata fields to update
   */
  updateSession(sessionId: string, metadata: Partial<MediaMetadata>): void;
  /**
   * Destroy a media session.
   * @param sessionId  The session to destroy
   */
  destroySession(sessionId: string): void;
  /**
   * Report current playback state for a session.
   * @param sessionId  The session to report state for
   * @param state      Current playback state
   */
  reportState(sessionId: string, state: MediaState): void;
  /**
   * Declare which media actions the session currently supports.
   * @param sessionId  The session to update capabilities for
   * @param actions    Currently supported actions
   */
  reportCapabilities(sessionId: string, actions: MediaAction[]): void;
  /**
   * Send a command to the current playback owner.
   * @param sessionId  The session to control
   * @param action     The media action to request
   * @param value      Optional value for seek/volume
   */
  sendCommand(sessionId: string, action: MediaAction, value?: number): void;
  /**
   * Listen for media commands from the shell.
   * @param sessionId  The session to listen for commands on
   * @param callback   Called with (action, value?) when a command is received
   * @returns A Subscription with `close()` to stop listening
   */
  onCommand(sessionId: string, callback: (action: MediaAction, value?: number) => void): Subscription;
  /**
   * Listen for shell-reported playback state for shell-owned sessions.
   * @param sessionId  The session to listen for state on
   * @param callback   Called with playback state
   * @returns A Subscription with `close()` to stop listening
   */
  onState(sessionId: string, callback: (state: MediaState) => void): Subscription;
  /**
   * Listen for shell-reported capabilities for shell-owned sessions.
   * @param sessionId  The session to listen for capabilities on
   * @param callback   Called with available actions
   * @returns A Subscription with `close()` to stop listening
   */
  onCapabilities(sessionId: string, callback: (actions: MediaAction[]) => void): Subscription;
  /**
   * Listen for the shell's media control list.
   * @param sessionId  The session to associate controls with
   * @param callback   Called with the shell's supported controls
   * @returns A Subscription with `close()` to stop listening
   */
  onControls(sessionId: string, callback: (controls: MediaAction[]) => void): Subscription;
}

/**
 * Shell-rendered notifications: send notifications, set badge counts,
 * register channels, request permission, listen for user interaction.
 *
 * @example
 * ```ts
 * // Send a notification:
 * const { notificationId } = await window.napplet.notify.send({
 *   title: 'New message', body: 'Alice: hey!', priority: 'normal',
 * });
 *
 * // Set badge count:
 * window.napplet.notify.badge(3);
 *
 * // Listen for action clicks:
 * window.napplet.notify.onAction((notificationId, actionId) => {
 *   if (actionId === 'reply') openReply(notificationId);
 * });
 * ```
 */
export interface NotifyApi {
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
  }): Promise<{ notificationId: string }>;
  /**
   * Dismiss a notification by ID. Fire-and-forget.
   * @param notificationId  The notification to dismiss
   */
  dismiss(notificationId: string): void;
  /**
   * Set the badge count for this napplet. Pass 0 to clear.
   * @param count  Badge count
   */
  badge(count: number): void;
  /**
   * Register a notification channel for per-category user control.
   * @param channel  Channel definition
   */
  registerChannel(channel: {
    channelId: string;
    label: string;
    description?: string;
    defaultPriority?: 'low' | 'normal' | 'high' | 'urgent';
  }): void;
  /**
   * Request permission to send notifications.
   * @param channel  Optional channel to request permission for
   * @returns Whether permission was granted
   */
  requestPermission(channel?: string): Promise<{ granted: boolean }>;
  /**
   * Listen for action button clicks on notifications.
   * @param callback  Called with (notificationId, actionId)
   * @returns A Subscription with `close()` to stop listening
   */
  onAction(callback: (notificationId: string, actionId: string) => void): Subscription;
  /**
   * Listen for notification body clicks.
   * @param callback  Called with (notificationId)
   * @returns A Subscription with `close()` to stop listening
   */
  onClicked(callback: (notificationId: string) => void): Subscription;
  /**
   * Listen for notification dismissals.
   * @param callback  Called with (notificationId, reason?)
   * @returns A Subscription with `close()` to stop listening
   */
  onDismissed(callback: (notificationId: string, reason?: string) => void): Subscription;
  /**
   * Listen for the shell's notification capability list.
   * @param callback  Called with supported controls
   * @returns A Subscription with `close()` to stop listening
   */
  onControls(callback: (controls: ('toasts' | 'badges' | 'actions' | 'channels' | 'system')[]) => void): Subscription;
}
