/**
 * Napplet NAP media sdk entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/media -- SDK helpers wrapping window.napplet.media.
 *
 * These convenience functions delegate to `window.napplet.media.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { Subscription } from '@napplet/core';
import type {
  MediaSessionCreate,
  MediaSessionResult,
  MediaMetadata,
  MediaState,
  MediaAction,
  MediaSessionEnded,
} from './types.js';

interface MediaApi {
  createSession(options: MediaSessionCreate): Promise<MediaSessionResult>;
  updateSession(sessionId: string, metadata: Partial<MediaMetadata>): void;
  destroySession(sessionId: string): void;
  reportState(sessionId: string, state: MediaState): void;
  reportCapabilities(sessionId: string, actions: MediaAction[]): void;
  sendCommand(sessionId: string, action: MediaAction, value?: number, reason?: string): void;
  onCommand(
    sessionId: string,
    callback: (action: MediaAction, value?: number, reason?: string) => void,
  ): Subscription;
  onState(sessionId: string, callback: (state: MediaState) => void): Subscription;
  onCapabilities(sessionId: string, callback: (actions: MediaAction[]) => void): Subscription;
  onControls(sessionId: string, callback: (controls: MediaAction[]) => void): Subscription;
  onEnded(sessionId: string, callback: (ended: MediaSessionEnded) => void): Subscription;
}

function requireMedia(): MediaApi {
  const w = window as Window & { napplet?: { media?: MediaApi } };
  if (!w.napplet?.media) {
    throw new Error('window.napplet.media is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.media;
}

/**
 * Create a new media session.
 *
 * @param options  Ownership-aware media session options
 * @returns The confirmed session result
 *
 * @example
 * ```ts
 * import { mediaCreateSession } from '@napplet/nap/media';
 *
 * const { sessionId } = await mediaCreateSession({
 *   owner: 'napplet',
 *   metadata: { title: 'My Song', artist: 'The Artist' },
 * });
 * ```
 */
export function mediaCreateSession(options: MediaSessionCreate): Promise<MediaSessionResult> {
  return requireMedia().createSession(options);
}

/**
 * Update metadata for an existing session.
 *
 * @param sessionId  The session to update
 * @param metadata   Partial metadata fields to update
 *
 * @example
 * ```ts
 * import { mediaUpdateSession } from '@napplet/nap/media';
 *
 * mediaUpdateSession('s1', { title: 'Updated Title' });
 * ```
 */
export function mediaUpdateSession(sessionId: string, metadata: Partial<MediaMetadata>): void {
  requireMedia().updateSession(sessionId, metadata);
}

/**
 * Destroy a media session.
 *
 * @param sessionId  The session to destroy
 *
 * @example
 * ```ts
 * import { mediaDestroySession } from '@napplet/nap/media';
 *
 * mediaDestroySession('s1');
 * ```
 */
export function mediaDestroySession(sessionId: string): void {
  requireMedia().destroySession(sessionId);
}

/**
 * Report current playback state for a session.
 *
 * @param sessionId  The session to report state for
 * @param state      The current playback state
 *
 * @example
 * ```ts
 * import { mediaReportState } from '@napplet/nap/media';
 *
 * mediaReportState('s1', {
 *   status: 'playing',
 *   position: 42.5,
 *   duration: 240,
 *   volume: 0.8,
 * });
 * ```
 */
export function mediaReportState(
  sessionId: string,
  state: MediaState,
): void {
  requireMedia().reportState(sessionId, state);
}

/**
 * Declare which media actions the session currently supports.
 *
 * @param sessionId  The session to update capabilities for
 * @param actions    Currently supported actions
 *
 * @example
 * ```ts
 * import { mediaReportCapabilities } from '@napplet/nap/media';
 *
 * mediaReportCapabilities('s1', ['play', 'pause', 'seek', 'volume']);
 * ```
 */
export function mediaReportCapabilities(sessionId: string, actions: MediaAction[]): void {
  requireMedia().reportCapabilities(sessionId, actions);
}

/**
 * Send a media command to the current playback owner.
 *
 * @param sessionId  The session to control
 * @param action     The media action to request
 * @param value      Optional value for seek/volume
 * @param reason     Optional cause of the command, such as `user`
 *
 * @example
 * ```ts
 * import { mediaSendCommand } from '@napplet/nap/media';
 *
 * mediaSendCommand('shell-session', 'pause', undefined, 'user');
 * ```
 */
export function mediaSendCommand(
  sessionId: string,
  action: MediaAction,
  value?: number,
  reason?: string,
): void {
  requireMedia().sendCommand(sessionId, action, value, reason);
}

/**
 * Listen for media commands from the shell.
 *
 * @param sessionId  The session to listen for commands on
 * @param callback   Called with (action, value?, reason?) when a command is received
 * @returns A Subscription with `close()` to stop listening
 *
 * @example
 * ```ts
 * import { mediaOnCommand } from '@napplet/nap/media';
 *
 * const sub = mediaOnCommand('s1', (action, value, reason) => {
 *   if (action === 'seek') player.seekTo(value);
 *   if (action === 'pause') player.pause();
 *   if (action === 'play' && reason === 'focus-gained') player.play();
 * });
 * // Later: sub.close();
 * ```
 */
export function mediaOnCommand(
  sessionId: string,
  callback: (action: MediaAction, value?: number, reason?: string) => void,
): Subscription {
  return requireMedia().onCommand(sessionId, callback);
}

/**
 * Listen for shell-reported state for a shell-owned session.
 *
 * @param sessionId  The session to listen for state on
 * @param callback   Called with the current playback state
 * @returns A Subscription with `close()` to stop listening
 */
export function mediaOnState(
  sessionId: string,
  callback: (state: MediaState) => void,
): Subscription {
  return requireMedia().onState(sessionId, callback);
}

/**
 * Listen for shell-reported capabilities for a shell-owned session.
 *
 * @param sessionId  The session to listen for capabilities on
 * @param callback   Called with currently available actions
 * @returns A Subscription with `close()` to stop listening
 */
export function mediaOnCapabilities(
  sessionId: string,
  callback: (actions: MediaAction[]) => void,
): Subscription {
  return requireMedia().onCapabilities(sessionId, callback);
}

/**
 * Listen for the shell's media control list.
 *
 * @param sessionId  The session to associate controls with
 * @param callback   Called with the shell's supported controls
 * @returns A Subscription with `close()` to stop listening
 *
 * @example
 * ```ts
 * import { mediaOnControls } from '@napplet/nap/media';
 *
 * const sub = mediaOnControls('s1', (controls) => {
 *   showNextButton = controls.includes('next');
 * });
 * // Later: sub.close();
 * ```
 */
export function mediaOnControls(
  sessionId: string,
  callback: (controls: MediaAction[]) => void,
): Subscription {
  return requireMedia().onControls(sessionId, callback);
}

/**
 * Listen for terminal retirement of a session (`media.session.ended`).
 * A handler registered after retirement still receives the retained record once.
 *
 * @param sessionId  The session to watch for retirement
 * @param callback   Called once with the retirement record
 * @returns A Subscription with `close()` to stop listening
 *
 * @example
 * ```ts
 * import { mediaOnEnded } from '@napplet/nap/media';
 *
 * mediaOnEnded('s1', ({ reason }) => {
 *   player.stop();
 *   if (reason === 'preempted') showReplacedNotice();
 * });
 * ```
 */
export function mediaOnEnded(
  sessionId: string,
  callback: (ended: MediaSessionEnded) => void,
): Subscription {
  return requireMedia().onEnded(sessionId, callback);
}
