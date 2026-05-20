// @napplet/nub/media -- Media NUB shim (session management + command handlers)
// Manages media sessions, reports state/capabilities, handles shell commands and controls.

import type {
  MediaMetadata,
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

// ─── State ──────────────────────────────────────────────────────────────────

/** Pending session create requests: correlation id -> { resolve, reject }. */
const pendingCreates = new Map<string, {
  resolve: (value: { sessionId: string }) => void;
  reject: (reason: Error) => void;
}>();

/** Command handlers per session: sessionId -> Set of callbacks. */
const commandHandlers = new Map<string, Set<(action: MediaAction, value?: number) => void>>();

/** Controls handlers per session: sessionId -> Set of callbacks. */
const controlsHandlers = new Map<string, Set<(controls: MediaAction[]) => void>>();

/** Guard against double-install. */
let installed = false;

// ─── Message handlers (shell -> napplet) ────────────────────────────────────

/**
 * Handle media.session.create.result from the shell.
 * Resolves the pending creation promise.
 */
function handleCreateResult(msg: MediaSessionCreateResultMessage): void {
  const pending = pendingCreates.get(msg.id);
  if (!pending) return;
  pendingCreates.delete(msg.id);

  if (msg.error) {
    pending.reject(new Error(msg.error));
    return;
  }

  pending.resolve({ sessionId: msg.sessionId });
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
  // Controls is session-agnostic -- broadcast to all registered handlers
  for (const [, handlers] of controlsHandlers) {
    for (const cb of handlers) {
      cb(msg.controls);
    }
  }
}

// ─── Shell message router ────────────────────────────────────────────────────

/**
 * Handle media.* messages from the shell via the central message listener.
 */
export function handleMediaMessage(msg: { type: string; [key: string]: unknown }): void {
  const type = msg.type;

  if (type === 'media.session.create.result') {
    handleCreateResult(msg as unknown as MediaSessionCreateResultMessage);
  } else if (type === 'media.command') {
    handleCommand(msg as unknown as MediaCommandMessage);
  } else if (type === 'media.controls') {
    handleControls(msg as unknown as MediaControlsMessage);
  }
}

// ─── Public API (installed on window.napplet.media) ──────────────────────────

/**
 * Create a new media session with the shell.
 * Returns the confirmed session ID.
 *
 * @param metadata  Optional initial metadata for the session
 * @returns The confirmed session result
 */
export function createSession(metadata?: MediaMetadata): Promise<{ sessionId: string }> {
  const id = crypto.randomUUID();
  const sessionId = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    pendingCreates.set(id, { resolve, reject });

    const msg: MediaSessionCreateMessage = {
      type: 'media.session.create',
      id,
      sessionId,
      metadata,
    };
    window.parent.postMessage(msg, '*');

    setTimeout(() => {
      if (pendingCreates.delete(id)) {
        reject(new Error('media.session.create timed out'));
      }
    }, 30_000);
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

  // Clean up local handlers for this session
  commandHandlers.delete(sessionId);
  controlsHandlers.delete(sessionId);
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
  state: { status: 'playing' | 'paused' | 'stopped' | 'buffering'; position?: number; duration?: number; volume?: number },
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
 * Listen for the shell's media control list.
 * Returns a Subscription with close() to stop listening.
 *
 * @param sessionId  The session to associate controls with
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

// ─── Install / cleanup ──────────────────────────────────────────────────────

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
    pendingCreates.clear();
    commandHandlers.clear();
    controlsHandlers.clear();
    installed = false;
  };
}
