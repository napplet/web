// @napplet/nap/intent -- Archetype intent dispatcher shim (invoke / open / available / handlers / changed push).
// Correlates intent.* request/result envelopes; routes intent.changed pushes to listeners.
// The shell owns archetype resolution, default handling, window lifecycle, and payload delivery.

import { postToShell } from '../boundary.js';
import type { Subscription } from '@napplet/core';
import type {
  IntentRequest,
  IntentResult,
  IntentAvailability,
  IntentInvokeMessage,
  IntentAvailableMessage,
  IntentHandlersMessage,
  IntentInvokeResultMessage,
  IntentAvailableResultMessage,
  IntentHandlersResultMessage,
  IntentChangedMessage,
} from './types.js';

/** Default timeout for intent request-responses (30s; aligns with other NAPs). */
const REQUEST_TIMEOUT_MS = 30_000;

/** Pending invoke requests: correlation id -> resolver record. */
const pendingInvoke = new Map<string, {
  resolve: (result: IntentResult) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** Pending available requests: correlation id -> resolver record. */
const pendingAvailable = new Map<string, {
  resolve: (availability: IntentAvailability) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** Pending handlers requests: correlation id -> resolver record. */
const pendingHandlers = new Map<string, {
  resolve: (handlers: IntentAvailability[]) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** Availability-change listeners (each receives every intent.changed). */
const changedHandlers = new Set<(availability: IntentAvailability) => void>();

/** Guard against double-install. */
let installed = false;

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

function handleInvokeResult(msg: IntentInvokeResultMessage): void {
  const p = pendingInvoke.get(msg.id);
  if (!p) return;
  pendingInvoke.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.result !== undefined) {
    p.resolve(msg.result);
    return;
  }
  p.reject(new Error(msg.error ?? 'invoke failed'));
}

function handleAvailableResult(msg: IntentAvailableResultMessage): void {
  const p = pendingAvailable.get(msg.id);
  if (!p) return;
  pendingAvailable.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.availability !== undefined) {
    p.resolve(msg.availability);
    return;
  }
  p.reject(new Error(msg.error ?? 'intent availability unavailable'));
}

function handleHandlersResult(msg: IntentHandlersResultMessage): void {
  const p = pendingHandlers.get(msg.id);
  if (!p) return;
  pendingHandlers.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.handlers !== undefined) {
    p.resolve(msg.handlers);
    return;
  }
  p.reject(new Error(msg.error ?? 'intent handlers unavailable'));
}

function handleChanged(msg: IntentChangedMessage): void {
  if (!msg.availability) return;
  for (const cb of changedHandlers) cb(msg.availability);
}

/**
 * Handle intent.* messages from the shell via the central message listener.
 * Covers invoke/available/handlers results plus the changed push.
 */
export function handleIntentMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<IntentInvokeResultMessage>(msg, 'intent.invoke.result')) {
    handleInvokeResult(msg);
  } else if (isMessageType<IntentAvailableResultMessage>(msg, 'intent.available.result')) {
    handleAvailableResult(msg);
  } else if (isMessageType<IntentHandlersResultMessage>(msg, 'intent.handlers.result')) {
    handleHandlersResult(msg);
  } else if (isMessageType<IntentChangedMessage>(msg, 'intent.changed')) {
    handleChanged(msg);
  }
}

/**
 * Invoke a napplet by archetype. The shell resolves the archetype to a handler
 * (the user's default, the napplet named in `request.handler`, or a user choice
 * when `handler: "choose"`), creates or focuses its window, and delivers the
 * payload using `request.protocol` (or the archetype's default). Resolves with
 * the structured result (including `ok: false` / `handled: false` on resolution
 * or delivery failure); rejects only when the shell returns a top-level error.
 *
 * @param request  The intent request (archetype + action + payload + routing)
 * @returns Promise resolving to the invocation result
 *
 * @example
 * ```ts
 * const r = await invoke({ archetype: 'note', action: 'open', payload: { target: { type: 'event', id } } });
 * if (!r.handled) showFallback(r.error);
 * ```
 */
export function invoke(request: IntentRequest): Promise<IntentResult> {
  const id = crypto.randomUUID();
  return new Promise<IntentResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingInvoke.delete(id)) reject(new Error('intent.invoke timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingInvoke.set(id, { resolve, reject, timeout });

    const msg: IntentInvokeMessage = {
      type: 'intent.invoke',
      id,
      request,
    };
    postToShell(msg);
  });
}

/**
 * Convenience sugar for the common `action: "open"` case.
 * Equivalent to `invoke({ archetype, action: 'open', payload, ...opts })`.
 *
 * @param archetype  Role slug to open
 * @param payload    Opaque payload (typed by the resolved protocol)
 * @param opts       Extra request fields (protocol, handler, behavior)
 * @returns Promise resolving to the invocation result
 *
 * @example
 * ```ts
 * await open('emoji-list', { seed: ['🤙', '⚡'] }, { behavior: { focus: true } });
 * ```
 */
export function open(
  archetype: string,
  payload?: unknown,
  opts?: Omit<IntentRequest, 'archetype' | 'action' | 'payload'>,
): Promise<IntentResult> {
  return invoke({ archetype, action: 'open', payload, ...opts });
}

/**
 * Check whether the runtime can currently satisfy `archetype`, with the candidate
 * napplets and the actions/protocols each supports. Sourced from the installed
 * catalog, so it reports `true` for an installed handler that is not yet running.
 * Use as a pre-flight guardrail before showing an affordance.
 *
 * @param archetype  Role slug to check
 * @returns Promise resolving to the archetype availability
 */
export function available(archetype: string): Promise<IntentAvailability> {
  const id = crypto.randomUUID();
  return new Promise<IntentAvailability>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingAvailable.delete(id)) reject(new Error('intent.available timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingAvailable.set(id, { resolve, reject, timeout });

    const msg: IntentAvailableMessage = {
      type: 'intent.available',
      id,
      archetype,
    };
    postToShell(msg);
  });
}

/**
 * Get availability for every archetype the runtime can currently satisfy.
 * Useful for menus and capability surfaces.
 *
 * @returns Promise resolving to availability for each satisfiable archetype
 */
export function handlers(): Promise<IntentAvailability[]> {
  const id = crypto.randomUUID();
  return new Promise<IntentAvailability[]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingHandlers.delete(id)) reject(new Error('intent.handlers timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingHandlers.set(id, { resolve, reject, timeout });

    const msg: IntentHandlersMessage = {
      type: 'intent.handlers',
      id,
    };
    postToShell(msg);
  });
}

/**
 * Register for shell-pushed availability updates (`intent.changed`) -- fired when
 * a napplet is installed/removed or a default handler changes. The handler
 * receives every change; filter on `availability.archetype` to scope.
 *
 * @param handler  Called with each updated IntentAvailability
 * @returns A Subscription with `close()` to stop listening
 */
export function onChanged(handler: (availability: IntentAvailability) => void): Subscription {
  changedHandlers.add(handler);
  return {
    close(): void {
      changedHandlers.delete(handler);
    },
  };
}

/**
 * Install the intent shim. Registration-only -- intents are issued on demand,
 * not at install time.
 *
 * @returns cleanup function that rejects pending requests and clears all state
 */
export function installIntentShim(): () => void {
  if (installed) {
    return () => undefined; // already installed: no-op cleanup
  }
  installed = true;
  return () => {
    for (const p of pendingInvoke.values()) clearTimeout(p.timeout);
    for (const p of pendingAvailable.values()) clearTimeout(p.timeout);
    for (const p of pendingHandlers.values()) clearTimeout(p.timeout);
    pendingInvoke.clear();
    pendingAvailable.clear();
    pendingHandlers.clear();
    changedHandlers.clear();
    installed = false;
  };
}
