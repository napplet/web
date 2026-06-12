// @napplet/nap/media -- Media NAP shim (session management + command handlers)
// Manages media sessions, reports state/capabilities, handles shell commands and controls.

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
} from './types.js';
import type { Subscription } from '@napplet/core';

/** Pending session create requests: correlation id -> { resolve, reject }. */
const pendingCreates = new Map<string, {
  resolve: (value: MediaSessionResult) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** Command handlers per session: sessionId -> Set of callbacks. */
const commandHandlers = new Map<string, Set<(action: MediaAction, value?: number) => void>>();

/** Controls handlers per session: sessionId -> Set of callbacks. */
const controlsHandlers = new Map<string, Set<(controls: MediaAction[]) => void>>();

/** State handlers per session: sessionId -> Set of callbacks. */
const stateHandlers = new Map<string, Set<(state: MediaState) => void>>();

/** Capabilities handlers per session: sessionId -> Set of callbacks. */
const capabilitiesHandlers = new Map<string, Set<(actions: MediaAction[]) => void>>();

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
  const handlers = commandHandlers.get(msg.sessionId);
  if (!handlers) return;
  for (const cb of handlers) {
    cb(msg.action, msg.value);
  }
}

/**
 * Handle media.controls from the shell.
 * Dispatches to registered controls handlers.
 */
function handleControls(msg: MediaControlsMessage): void {
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
  const handlers = stateHandlers.get(msg.sessionId);
  if (!handlers) return;
  const state: MediaState = {
    status: msg.status,
    position: msg.position,
    duration: msg.duration,
    volume: msg.volume,
  };
  for (const cb of handlers) {
    cb(state);
  }
}

/**
 * Handle media.capabilities from the shell for shell-owned playback.
 */
function handleCapabilities(msg: MediaCapabilitiesMessage): void {
  const handlers = capabilitiesHandlers.get(msg.sessionId);
  if (!handlers) return;
  for (const cb of handlers) {
    cb(msg.actions);
  }
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
    window.parent.postMessage(msg, '*');
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
  window.parent.postMessage(msg, '*');
}

/**
 * Destroy a media session.
 * Fire-and-forget -- no response expected.
 *
 * @param sessionId  The session to destroy
 */
export function destroySession(sessionId: string): void {
  const msg: MediaSessionDestroyMessage = {
    type: 'media.session.destroy',
    sessionId,
  };
  window.parent.postMessage(msg, '*');

  commandHandlers.delete(sessionId);
  controlsHandlers.delete(sessionId);
  stateHandlers.delete(sessionId);
  capabilitiesHandlers.delete(sessionId);
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
  window.parent.postMessage(msg, '*');
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
  window.parent.postMessage(msg, '*');
}

/**
 * Send a media command to the current playback owner.
 * Used by napplets to control shell-owned sessions.
 *
 * @param sessionId  The session to control
 * @param action     The media action to request
 * @param value      Optional value for seek/volume
 */
export function sendCommand(sessionId: string, action: MediaAction, value?: number): void {
  const msg: MediaCommandMessage = {
    type: 'media.command',
    sessionId,
    action,
    ...(value === undefined ? {} : { value }),
  };
  window.parent.postMessage(msg, '*');
}

/**
 * Listen for media commands from the shell for a specific session.
 * Returns a Subscription with close() to stop listening.
 *
 * @param sessionId  The session to listen for commands on
 * @param callback   Called with (action, value?) when a command is received
 * @returns A Subscription with `close()` to unsubscribe
 */
export function onCommand(
  sessionId: string,
  callback: (action: MediaAction, value?: number) => void,
): Subscription {
  if (!commandHandlers.has(sessionId)) {
    commandHandlers.set(sessionId, new Set());
  }
  commandHandlers.get(sessionId)!.add(callback);

  return {
    close(): void {
      const handlers = commandHandlers.get(sessionId);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) commandHandlers.delete(sessionId);
      }
    },
  };
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
  if (!stateHandlers.has(sessionId)) {
    stateHandlers.set(sessionId, new Set());
  }
  stateHandlers.get(sessionId)!.add(callback);

  return {
    close(): void {
      const handlers = stateHandlers.get(sessionId);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) stateHandlers.delete(sessionId);
      }
    },
  };
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
  if (!capabilitiesHandlers.has(sessionId)) {
    capabilitiesHandlers.set(sessionId, new Set());
  }
  capabilitiesHandlers.get(sessionId)!.add(callback);

  return {
    close(): void {
      const handlers = capabilitiesHandlers.get(sessionId);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) capabilitiesHandlers.delete(sessionId);
      }
    },
  };
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
  if (!controlsHandlers.has(sessionId)) {
    controlsHandlers.set(sessionId, new Set());
  }
  controlsHandlers.get(sessionId)!.add(callback);

  return {
    close(): void {
      const handlers = controlsHandlers.get(sessionId);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) controlsHandlers.delete(sessionId);
      }
    },
  };
}

/**
 * Install the media shim. Currently a no-op placeholder --
 * media sessions are created on demand, not at install time.
 *
 * @returns cleanup function that clears all state
 */
export function installMediaShim(): () => void {
  if (installed) {
    return () => { /* already installed */ };
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
    installed = false;
  };
}
