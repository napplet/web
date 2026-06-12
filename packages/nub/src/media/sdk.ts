/**
 * @napplet/nub/media -- SDK helpers wrapping window.napplet.media.
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
} from './types.js';

interface MediaApi {
  createSession(options: MediaSessionCreate): Promise<MediaSessionResult>;
  updateSession(sessionId: string, metadata: Partial<MediaMetadata>): void;
  destroySession(sessionId: string): void;
  reportState(sessionId: string, state: MediaState): void;
  reportCapabilities(sessionId: string, actions: MediaAction[]): void;
  sendCommand(sessionId: string, action: MediaAction, value?: number): void;
  onCommand(sessionId: string, callback: (action: MediaAction, value?: number) => void): Subscription;
  onState(sessionId: string, callback: (state: MediaState) => void): Subscription;
  onCapabilities(sessionId: string, callback: (actions: MediaAction[]) => void): Subscription;
  onControls(sessionId: string, callback: (controls: MediaAction[]) => void): Subscription;
}

function requireMedia(): MediaApi {
  const w = window as Window & { napplet?: { media?: MediaApi } };
  if (!w.napplet?.media) {
    throw new Error('window.napplet.media not installed -- import @napplet/shim first');
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
 * import { mediaCreateSession } from '@napplet/nub/media';
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
 * import { mediaUpdateSession } from '@napplet/nub/media';
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
 * import { mediaDestroySession } from '@napplet/nub/media';
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
 * import { mediaReportState } from '@napplet/nub/media';
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
 * import { mediaReportCapabilities } from '@napplet/nub/media';
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
 *
 * @example
 * ```ts
 * import { mediaSendCommand } from '@napplet/nub/media';
 *
 * mediaSendCommand('shell-session', 'pause');
 * ```
 */
export function mediaSendCommand(sessionId: string, action: MediaAction, value?: number): void {
  requireMedia().sendCommand(sessionId, action, value);
}

/**
 * Listen for media commands from the shell.
 *
 * @param sessionId  The session to listen for commands on
 * @param callback   Called with (action, value?) when a command is received
 * @returns A Subscription with `close()` to stop listening
 *
 * @example
 * ```ts
 * import { mediaOnCommand } from '@napplet/nub/media';
 *
 * const sub = mediaOnCommand('s1', (action, value) => {
 *   if (action === 'seek') player.seekTo(value);
 *   if (action === 'pause') player.pause();
 * });
 * // Later: sub.close();
 * ```
 */
export function mediaOnCommand(
  sessionId: string,
  callback: (action: MediaAction, value?: number) => void,
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
 * import { mediaOnControls } from '@napplet/nub/media';
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
