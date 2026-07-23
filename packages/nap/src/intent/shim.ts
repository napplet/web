/**
 * Napplet NAP intent shim entrypoint.
 *
 * @module
 */

// @napplet/nap/intent -- URI-shaped intent dispatcher shim.
// Correlates immediate acceptance results and routes independent target deliveries.
// The runtime owns handler resolution and delivery lifecycle policy.

import { postToShell } from '../boundary.js';
import { normalizeConventionUri } from '../convention-uri.js';
import type { Subscription } from '@napplet/core';
import type {
  IntentDelivery,
  IntentInvokeOptions,
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
  IntentDeliveryMessage,
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

/** Target-delivery handlers registered by the receiving napplet. */
const deliveryHandlers = new Set<(delivery: IntentDelivery) => void>();

/** Runtime deliveries retained until the first target handler registers. */
const retainedDeliveries: IntentDelivery[] = [];

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

/** Drop unexpected carrier fields before exposing a runtime delivery to app code. */
function normalizeIntentDelivery(value: unknown): IntentDelivery | undefined {
  if (!isRecord(value)
    || typeof value.sender !== 'string'
    || typeof value.archetype !== 'string'
    || typeof value.action !== 'string'
    || typeof value.convention !== 'string') {
    return undefined;
  }

  return {
    sender: value.sender,
    archetype: value.archetype,
    action: value.action,
    convention: value.convention,
    ...(hasOwn(value, 'payload') ? { payload: value.payload } : {}),
  };
}

function handleDelivery(msg: IntentDeliveryMessage): void {
  const delivery = normalizeIntentDelivery(msg.delivery);
  if (!delivery) return;

  if (deliveryHandlers.size === 0) {
    retainedDeliveries.push(delivery);
    return;
  }

  for (const handler of deliveryHandlers) handler(delivery);
}

/**
 * Handle intent.* messages from the shell via the central message listener.
 * Covers invoke/available/handlers results plus the changed push.
 */
export function handleIntentMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<IntentDeliveryMessage>(msg, 'intent.deliver')) {
    handleDelivery(msg);
  } else if (isMessageType<IntentInvokeResultMessage>(msg, 'intent.invoke.result')) {
    handleInvokeResult(msg);
  } else if (isMessageType<IntentAvailableResultMessage>(msg, 'intent.available.result')) {
    handleAvailableResult(msg);
  } else if (isMessageType<IntentHandlersResultMessage>(msg, 'intent.handlers.result')) {
    handleHandlersResult(msg);
  } else if (isMessageType<IntentChangedMessage>(msg, 'intent.changed')) {
    handleChanged(msg);
  }
}

function normalizeIntentRequest(uri: string, options?: IntentInvokeOptions): IntentRequest {
  const normalized = normalizeConventionUri(uri, options?.payload);
  const supplied = options as (IntentInvokeOptions & Record<string, unknown>) | undefined;

  if (supplied && hasOwn(supplied, 'sender')) {
    throw new Error('Intent callers cannot supply sender');
  }

  for (const field of ['archetype', 'action', 'convention'] as const) {
    if (supplied && hasOwn(supplied, field) && supplied[field] !== normalized[field]) {
      throw new Error(`Intent options cannot override URI-derived ${field}`);
    }
  }

  return {
    archetype: normalized.archetype,
    action: normalized.action,
    convention: normalized.convention,
    ...(normalized.payload !== undefined ? { payload: normalized.payload } : {}),
    ...(options?.handler !== undefined ? { handler: options.handler } : {}),
    ...(options?.behavior !== undefined ? { behavior: options.behavior } : {}),
  };
}

function invokeNormalized(request: IntentRequest): Promise<IntentResult> {
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
 * Ask the runtime to accept responsibility for an intent delivery. The URI is
 * authoritative: its archetype, action, and queryless convention identity are
 * normalized before postMessage. `ok: true` does not mean the target has already
 * received or handled the delivery.
 *
 * @param uri  A `napplet:<archetype>/<intent>[...?params]` convention URI
 * @param options  Optional payload, handler preference, and behavior hints
 * @returns Promise resolving to immediate acceptance or pre-acceptance rejection
 *
 * @example
 * ```ts
 * const r = await invoke('napplet:note/open?event=abc123');
 * if (!r.ok) showFallback(r.error);
 * ```
 */
export function invoke(uri: string, options?: IntentInvokeOptions): Promise<IntentResult> {
  return invokeNormalized(normalizeIntentRequest(uri, options));
}

/**
 * Convenience sugar for a convention URI whose intent is `open`.
 *
 * @param uri  An `napplet:<archetype>/open[...?params]` convention URI
 * @param options  Optional payload, handler preference, and behavior hints
 * @returns Promise resolving to immediate acceptance or pre-acceptance rejection
 *
 * @example
 * ```ts
 * await open('napplet:emoji-list/open', { behavior: { focus: true } });
 * ```
 */
export function open(uri: string, options?: IntentInvokeOptions): Promise<IntentResult> {
  const request = normalizeIntentRequest(uri, options);
  if (request.action !== 'open') {
    throw new Error('intent.open requires a convention URI with an open intent');
  }
  return invokeNormalized(request);
}

/**
 * Register a target-only listener for runtime-delivered intents. Deliveries that
 * arrived before the first registration drain once in FIFO order. The carrier
 * has no delivery identifier and is independent of INC or source lifetime.
 *
 * @param handler  Called with each runtime-attested target delivery
 * @returns A Subscription with `close()` to stop receiving later deliveries
 */
export function onDelivery(handler: (delivery: IntentDelivery) => void): Subscription {
  const wasEmpty = deliveryHandlers.size === 0;
  deliveryHandlers.add(handler);

  if (wasEmpty) {
    const earlyDeliveries = retainedDeliveries.splice(0);
    for (const delivery of earlyDeliveries) handler(delivery);
  }

  return {
    close(): void {
      deliveryHandlers.delete(handler);
    },
  };
}

/**
 * Check whether the runtime can currently satisfy `archetype`, with the
 * candidate napplets and the actions and conventions each supports. Sourced
 * from the installed catalog, so it reports `true` for an installed handler that
 * is not yet running. Use as a pre-flight guardrail before showing an affordance.
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
 * @returns cleanup function that clears pending requests and retained deliveries
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
    deliveryHandlers.clear();
    retainedDeliveries.length = 0;
    installed = false;
  };
}
