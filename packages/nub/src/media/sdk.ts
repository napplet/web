/**
 * @napplet/nub/media -- SDK helpers wrapping window.napplet.media.
 *
 * These convenience functions delegate to `window.napplet.media.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { Subscription } from '@napplet/core';
import type { MediaMetadata, MediaAction } from './types.js';

// ─── Media API shape (structural, avoids circular dep on NappletGlobal) ────

interface MediaApi {
  createSession(metadata?: MediaMetadata): Promise<{ sessionId: string }>;
  updateSession(sessionId: string, metadata: Partial<MediaMetadata>): void;
  destroySession(sessionId: string): void;
  reportState(sessionId: string, state: { status: 'playing' | 'paused' | 'stopped' | 'buffering'; position?: number; duration?: number; volume?: number }): void;
  reportCapabilities(sessionId: string, actions: MediaAction[]): void;
  onCommand(sessionId: string, callback: (action: MediaAction, value?: number) => void): Subscription;
  onControls(sessionId: string, callback: (controls: MediaAction[]) => void): Subscription;
}

// ─── Runtime guard ──────────────────────────────────────────────────────────

function requireMedia(): MediaApi {
  const w = window as Window & { napplet?: { media?: MediaApi } };
  if (!w.napplet?.media) {
    throw new Error('window.napplet.media not installed -- import @napplet/shim first');
  }
  return w.napplet.media;
}

// ─── SDK functions ──────────────────────────────────────────────────────────

/**
 * Create a new media session.
 *
 * @param metadata  Optional initial metadata
 * @returns The confirmed session result
 *
 * @example
 * ```ts
 * import { mediaCreateSession } from '@napplet/nub/media';
 *
 * const { sessionId } = await mediaCreateSession({
 *   title: 'My Song',
 *   artist: 'The Artist',
 * });
 * ```
 */
export function mediaCreateSession(metadata?: MediaMetadata): Promise<{ sessionId: string }> {
  return requireMedia().createSession(metadata);
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
  state: { status: 'playing' | 'paused' | 'stopped' | 'buffering'; position?: number; duration?: number; volume?: number },
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
