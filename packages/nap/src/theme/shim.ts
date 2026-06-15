// @napplet/nap/theme -- Theme NAP shim (read-only shell theme access)
// theme.get is a request/response pair over postMessage; theme.changed is a
// shell-pushed update. Mirrors the identity shim (the other read-only NAP).

import type { Subscription } from '@napplet/core';
import type { Theme, ThemeGetMessage, ThemeNapMessage } from './types.js';

/** Default timeout for theme queries (30 seconds). */
const REQUEST_TIMEOUT_MS = 30_000;

/** Pending theme requests: correlation id -> { resolve, reject }. */
const pendingRequests = new Map<string, {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** theme.changed subscribers. */
const changeHandlers = new Set<(theme: Theme) => void>();

/** Guard against double-install. */
let installed = false;

const THEME_MESSAGE_TYPES = new Set<string>([
  'theme.get.result',
  'theme.changed',
  'theme.get',
]);

function isThemeNapMessage(msg: { type: string }): msg is ThemeNapMessage {
  return THEME_MESSAGE_TYPES.has(msg.type);
}

/**
 * Handle theme.* result and push messages from the shell via the central
 * message listener.
 */
export function handleThemeMessage(msg: { type: string; [key: string]: unknown }): void {
  if (!isThemeNapMessage(msg)) return;

  switch (msg.type) {
    case 'theme.get.result':
      resolveOrReject(msg.id, msg.theme, msg.error);
      return;
    case 'theme.changed':
      notifyChanged(msg.theme);
      return;

    case 'theme.get':
      // Request-side envelopes are sent napplet → shell; the handler should
      // never receive one. Exhaustiveness requires coverage; defensive no-op.
      return;

    default:
      // Compile-time exhaustiveness: adding a new ThemeNapMessage member
      // without a case here fails type-check.
      assertNever(msg);
      return;
  }
}

function resolveOrReject(id: string, value: unknown, error?: string): void {
  const pending = pendingRequests.get(id);
  if (!pending) return;
  pendingRequests.delete(id);
  clearTimeout(pending.timeout);
  if (error) {
    pending.reject(new Error(error));
  } else {
    pending.resolve(value);
  }
}

function notifyChanged(theme: Theme): void {
  for (const handler of changeHandlers) {
    handler(theme);
  }
}

function sendRequest<T>(msg: { type: string; id: string }): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingRequests.delete(msg.id)) {
        reject(new Error(`${msg.type} timed out`));
      }
    }, REQUEST_TIMEOUT_MS);

    pendingRequests.set(msg.id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout,
    });

    window.parent.postMessage(msg, '*');
  });
}

/**
 * Compile-time exhaustiveness assertion for the theme message switch.
 *
 * @param _msg  Never-narrowed value; unused at runtime.
 */
function assertNever(_msg: never): void {
  /* compile-time only — unreachable at runtime if the switch is exhaustive */
}

/**
 * Get the shell's current active theme.
 *
 * @returns The current theme payload (colors, optional fonts/background/title)
 *
 * @example
 * ```ts
 * const theme = await window.napplet.theme.get();
 * document.body.style.background = theme.colors.background;
 * ```
 */
export function get(): Promise<Theme> {
  const msg: ThemeGetMessage = {
    type: 'theme.get',
    id: crypto.randomUUID(),
  };
  return sendRequest<Theme>(msg);
}

/**
 * Listen for shell-pushed theme changes (theme.changed).
 *
 * @param handler  Called with the updated theme whenever the shell's active
 *                 theme changes
 * @returns Subscription with close() to detach the handler
 *
 * @example
 * ```ts
 * const sub = window.napplet.theme.onChanged((theme) => applyTheme(theme));
 * // later: sub.close();
 * ```
 */
export function onChanged(handler: (theme: Theme) => void): Subscription {
  changeHandlers.add(handler);
  let closed = false;
  return {
    close() {
      if (closed) return;
      closed = true;
      changeHandlers.delete(handler);
    },
  };
}

/**
 * Install the theme shim.
 *
 * @returns cleanup function that clears pending requests and change handlers
 */
export function installThemeShim(): () => void {
  if (installed) {
    return () => undefined; // already installed: no-op cleanup
  }

  installed = true;

  return () => {
    for (const pending of pendingRequests.values()) {
      clearTimeout(pending.timeout);
    }
    pendingRequests.clear();
    changeHandlers.clear();
    installed = false;
  };
}
