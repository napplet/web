/**
 * Napplet NAP media per-session handler registries.
 *
 * @module
 */

// @napplet/nap/media -- per-session callback registries and session retirement.
// Internal to the media shim; not a public subpath.

import type { Subscription } from '@napplet/core';
import type { MediaSessionEnded } from './types.js';

/** Callbacks keyed by session id. */
export type SessionHandlerMap<T extends (...args: never[]) => void> = Map<string, Set<T>>;

/**
 * Register a callback for one session and return a Subscription that removes it.
 *
 * @param handlers   Registry to add the callback to
 * @param sessionId  Session the callback belongs to
 * @param callback   Callback to register
 * @returns A Subscription with `close()` to unsubscribe
 */
export function addSessionHandler<T extends (...args: never[]) => void>(
  handlers: SessionHandlerMap<T>,
  sessionId: string,
  callback: T,
): Subscription {
  let set = handlers.get(sessionId);
  if (!set) {
    set = new Set();
    handlers.set(sessionId, set);
  }
  set.add(callback);

  return {
    close(): void {
      const current = handlers.get(sessionId);
      if (!current) return;
      current.delete(callback);
      if (current.size === 0) handlers.delete(sessionId);
    },
  };
}

/** Retirement handlers per session: sessionId -> Set of callbacks. */
const endedHandlers: SessionHandlerMap<(ended: MediaSessionEnded) => void> = new Map();

/**
 * Retained terminal records: sessionId -> retirement. NAP-MEDIA requires the
 * binding to keep these until the napplet endpoint is destroyed so late
 * `onEnded` handlers still receive them, and to discard later messages for
 * retired sessions.
 */
const endedSessions = new Map<string, MediaSessionEnded>();

/**
 * Whether the shell has retired a session.
 *
 * @param sessionId  Session to check
 * @returns true once `media.session.ended` arrived for the session
 */
export function isRetired(sessionId: string): boolean {
  return endedSessions.has(sessionId);
}

/**
 * Record a retirement and notify its handlers. Repeat retirements are ignored.
 *
 * @param ended  The retirement record from `media.session.ended`
 * @returns false when the session was already retired
 */
export function retire(ended: MediaSessionEnded): boolean {
  if (endedSessions.has(ended.sessionId)) return false;
  endedSessions.set(ended.sessionId, ended);

  const handlers = endedHandlers.get(ended.sessionId);
  endedHandlers.delete(ended.sessionId);
  if (handlers) {
    for (const cb of handlers) cb(ended);
  }
  return true;
}

/**
 * Listen for a session's retirement. If the session already retired, the
 * retained record is delivered once on a microtask, so the caller can still
 * close the subscription first.
 *
 * @param sessionId  The session to watch for retirement
 * @param callback   Called once with the retirement record
 * @returns A Subscription with `close()` to unsubscribe
 */
export function onEnded(
  sessionId: string,
  callback: (ended: MediaSessionEnded) => void,
): Subscription {
  const retired = endedSessions.get(sessionId);
  if (!retired) return addSessionHandler(endedHandlers, sessionId, callback);

  let open = true;
  queueMicrotask(() => {
    if (open) callback(retired);
  });
  return {
    close(): void {
      open = false;
    },
  };
}

/** Forget every retirement handler and retained record (endpoint teardown). */
export function clearRetirements(): void {
  endedHandlers.clear();
  endedSessions.clear();
}
