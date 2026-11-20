/**
 * Napplet NAP media shim entrypoint.
 *
 * @module
 */

// @napplet/nap/media -- Media NAP shim (session management + command handlers)
// Manages media sessions, reports state/capabilities, handles shell commands and controls.

import { postToShell } from '../boundary.js';
import type {
  MediaSessionCreate,
  MediaSessionResult,
  MediaMetadata,
  MediaState,
  MediaAction,
  MediaSessionCreateMessage,
  MediaSessionUpdateMessage,
  MediaSessionDestroyMessage,
  MediaStateMessage,
  MediaCapabilitiesMessage,
  MediaSessionCreateResultMessage,
  MediaCommandMessage,
  MediaControlsMessage,
  MediaSessionEndedMessage,
} from './types.js';
import type { Subscription } from '@napplet/core';
import {
  addSessionHandler,
  clearRetirements,
  isRetired,
  retire,
  type SessionHandlerMap,
} from './session-handlers.js';

export { onEnded } from './session-handlers.js';

/** Pending session create requests: correlation id -> { resolve, reject }. */
const pendingCreates = new Map<string, {
  resolve: (value: MediaSessionResult) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** Command handlers per session. */
const commandHandlers: SessionHandlerMap<(action: MediaAction, value?: number, reason?: string) => void> = new Map();

/** Controls handlers per session. */
const controlsHandlers: SessionHandlerMap<(controls: MediaAction[]) => void> = new Map();

/** State handlers per session. */
const stateHandlers: SessionHandlerMap<(state: MediaState) => void> = new Map();

/** Capabilities handlers per session. */
const capabilitiesHandlers: SessionHandlerMap<(actions: MediaAction[]) => void> = new Map();

/** Drop every non-retirement callback registered for a session. */
function clearSessionHandlers(sessionId: string): void {
  commandHandlers.delete(sessionId);
  controlsHandlers.delete(sessionId);
  stateHandlers.delete(sessionId);
  capabilitiesHandlers.delete(sessionId);
}

/** Guard against double-install. */
let installed = false;

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

/**
 * Handle media.session.create.result from the shell.
 * Resolves the pending creation promise.
 */
function handleCreateResult(msg: MediaSessionCreateResultMessage): void {
  const pending = pendingCreates.get(msg.id);
  if (!pending) return;
  pendingCreates.delete(msg.id);
  clearTimeout(pending.timeout);

  const result: MediaSessionResult = {};
  if (msg.sessionId !== undefined) result.sessionId = msg.sessionId;
  if (msg.owner !== undefined) result.owner = msg.owner;
  if (msg.error !== undefined) result.error = msg.error;
  pending.resolve(result);
}

/**
 * Handle media.command from the shell.
 * Dispatches to registered command handlers for the session.
 */
function handleCommand(msg: MediaCommandMessage): void {
  if (isRetired(msg.sessionId)) return;
  const handlers = commandHandlers.get(msg.sessionId);
  if (!handlers) return;
  for (const cb of handlers) {
    cb(msg.action, msg.value, msg.reason);
  }
}

/**
 * Handle media.controls from the shell.
 * Dispatches to registered controls handlers.
 */
function handleControls(msg: MediaControlsMessage): void {
  if (isRetired(msg.sessionId)) return;
  const handlers = controlsHandlers.get(msg.sessionId);
  if (!handlers) return;
  for (const cb of handlers) {
    cb(msg.controls);
  }
}

/**
 * Handle media.state from the shell for shell-owned playback.
 */
function handleState(msg: MediaStateMessage): void {
  if (isRetired(msg.sessionId)) return;
  const handlers = stateHandlers.get(msg.sessionId);
  if (!handlers) return;
  const state: MediaState = {
    status: msg.status,
    position: msg.position,
    duration: msg.duration,
    volume: msg.volume,
  };
  if (msg.reason !== undefined) state.reason = msg.reason;
  for (const cb of handlers) {
    cb(state);
  }
}

/**
 * Handle media.capabilities from the shell for shell-owned playback.
 */
function handleCapabilities(msg: MediaCapabilitiesMessage): void {
  if (isRetired(msg.sessionId)) return;
  const handlers = capabilitiesHandlers.get(msg.sessionId);
  if (!handlers) return;
  for (const cb of handlers) {
    cb(msg.actions);
  }
}

/**
 * Handle media.session.ended from the shell.
 * Retires the session exactly once: retains the terminal record, stops every
 * other per-session callback, and notifies registered retirement handlers.
 * The reason is passed through as received; an unrecognized reason is an
 * unspecified cause but still retires the session.
 */
function handleSessionEnded(msg: MediaSessionEndedMessage): void {
  if (typeof msg.sessionId !== 'string' || isRetired(msg.sessionId)) return;
  clearSessionHandlers(msg.sessionId);
  retire({ sessionId: msg.sessionId, reason: msg.reason });
}

/**
 * Handle media.* messages from the shell via the central message listener.
 */
export function handleMediaMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<MediaSessionCreateResultMessage>(msg, 'media.session.create.result')) {
    handleCreateResult(msg);
  } else if (isMessageType<MediaCommandMessage>(msg, 'media.command')) {
    handleCommand(msg);
  } else if (isMessageType<MediaControlsMessage>(msg, 'media.controls')) {
    handleControls(msg);
  } else if (isMessageType<MediaStateMessage>(msg, 'media.state')) {
    handleState(msg);
  } else if (isMessageType<MediaCapabilitiesMessage>(msg, 'media.capabilities')) {
    handleCapabilities(msg);
  } else if (isMessageType<MediaSessionEndedMessage>(msg, 'media.session.ended')) {
    handleSessionEnded(msg);
  }
}

/**
 * Create a new media session with the shell.
 * Returns the shell result with the canonical session ID and owner, or error.
 *
 * @param options  Ownership-aware media session options
 * @returns The confirmed session result
 */
export function createSession(options: MediaSessionCreate): Promise<MediaSessionResult> {
  const id = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingCreates.delete(id)) {
        reject(new Error('media.session.create timed out'));
      }
    }, 30_000);

    pendingCreates.set(id, { resolve, reject, timeout });

    const msg: MediaSessionCreateMessage = {
      type: 'media.session.create',
      id,
      ...options,
    };
    postToShell(msg);
  });
}

/**
 * Update metadata for an existing session.
 * Fire-and-forget -- no response expected.
 *
 * @param sessionId  The session to update
 * @param metadata   Partial metadata fields to update
 */
export function updateSession(sessionId: string, metadata: Partial<MediaMetadata>): void {
  const msg: MediaSessionUpdateMessage = {
    type: 'media.session.update',
    sessionId,
    metadata,
  };
  postToShell(msg);
}

/**
 * Request retirement of a media session.
 * Fire-and-forget. The shell answers with `media.session.ended` (reason
 * `destroyed`), so `onEnded` handlers stay registered until it arrives.
 *
 * @param sessionId  The session to destroy
 */
export function destroySession(sessionId: string): void {
  const msg: MediaSessionDestroyMessage = {
    type: 'media.session.destroy',
    sessionId,
  };
  postToShell(msg);
  clearSessionHandlers(sessionId);
}

/**
 * Report current playback state for a session.
 * Fire-and-forget, high frequency during active playback.
 *
 * @param sessionId  The session to report state for
 * @param state      The current playback state
 */
export function reportState(
  sessionId: string,
  state: MediaState,
): void {
  const msg: MediaStateMessage = {
    type: 'media.state',
    sessionId,
    ...state,
  };
  postToShell(msg);
}

/**
 * Declare which media actions the session currently supports.
 * Fire-and-forget.
 *
 * @param sessionId  The session to update capabilities for
 * @param actions    Currently supported actions
 */
export function reportCapabilities(sessionId: string, actions: MediaAction[]): void {
  const msg: MediaCapabilitiesMessage = {
    type: 'media.capabilities',
    sessionId,
    actions,
  };
  postToShell(msg);
}

/**
 * Send a media command to the current playback owner.
 * Used by napplets to control shell-owned sessions.
 *
 * @param sessionId  The session to control
 * @param action     The media action to request
 * @param value      Optional value for seek/volume
 * @param reason     Optional cause of the command, such as `user`
 */
export function sendCommand(
  sessionId: string,
  action: MediaAction,
  value?: number,
  reason?: string,
): void {
  const msg: MediaCommandMessage = {
    type: 'media.command',
    sessionId,
    action,
    ...(value === undefined ? {} : { value }),
    ...(reason === undefined ? {} : { reason }),
  };
  postToShell(msg);
}

/**
 * Listen for media commands from the shell for a specific session.
 * Returns a Subscription with close() to stop listening.
 *
 * @param sessionId  The session to listen for commands on
 * @param callback   Called with (action, value?, reason?) when a command is received
 * @returns A Subscription with `close()` to unsubscribe
 */
export function onCommand(
  sessionId: string,
  callback: (action: MediaAction, value?: number, reason?: string) => void,
): Subscription {
  return addSessionHandler(commandHandlers, sessionId, callback);
}

/**
 * Listen for shell-reported state for a shell-owned session.
 * Returns a Subscription with close() to stop listening.
 *
 * @param sessionId  The session to listen for state on
 * @param callback   Called with the shell-owned playback state
 * @returns A Subscription with `close()` to unsubscribe
 */
export function onState(
  sessionId: string,
  callback: (state: MediaState) => void,
): Subscription {
  return addSessionHandler(stateHandlers, sessionId, callback);
}

/**
 * Listen for shell-reported capabilities for a shell-owned session.
 * Returns a Subscription with close() to stop listening.
 *
 * @param sessionId  The session to listen for capabilities on
 * @param callback   Called with currently available actions
 * @returns A Subscription with `close()` to unsubscribe
 */
export function onCapabilities(
  sessionId: string,
  callback: (actions: MediaAction[]) => void,
): Subscription {
  return addSessionHandler(capabilitiesHandlers, sessionId, callback);
}

/**
 * Listen for the shell's media control list for a specific session.
 * Returns a Subscription with close() to stop listening.
 *
 * @param sessionId  The session to listen for controls on
 * @param callback   Called with the shell's supported controls
 * @returns A Subscription with `close()` to unsubscribe
 */
export function onControls(
  sessionId: string,
  callback: (controls: MediaAction[]) => void,
): Subscription {
  return addSessionHandler(controlsHandlers, sessionId, callback);
}

/**
 * Install the media shim. Currently a no-op placeholder --
 * media sessions are created on demand, not at install time.
 *
 * @returns cleanup function that clears all state
 */
export function installMediaShim(): () => void {
  if (installed) {
    return () => undefined; // already installed: no-op cleanup
  }

  installed = true;

  return () => {
    for (const pending of pendingCreates.values()) {
      clearTimeout(pending.timeout);
    }
    pendingCreates.clear();
    commandHandlers.clear();
    controlsHandlers.clear();
    stateHandlers.clear();
    capabilitiesHandlers.clear();
    clearRetirements();
    installed = false;
  };
}
