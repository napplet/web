/**
 * Napplet NAP outbox shim entrypoint.
 *
 * @module
 */

// @napplet/nap/outbox -- Outbox-aware relay routing shim (query / subscribe / publish / resolveRelays).
// Correlates outbox.* request/result envelopes; streams outbox.event/closed to subscription listeners.
// The shell owns relay discovery, routing, fallback, deduplication, signing, and publish fanout.

import { postToShell } from '../boundary.js';
import type { NostrFilter, RelayEventResult, EventTemplate } from '@napplet/core';
import type {
  OutboxEventOptions,
  OutboxQueryOptions,
  OutboxSubscribeOptions,
  OutboxPublishOptions,
  OutboxTarget,
  OutboxRelayPlan,
  OutboxEventResult,
  OutboxResult,
  OutboxPublishResult,
  OutboxSubscription,
  OutboxGetEventMessage,
  OutboxQueryMessage,
  OutboxSubscribeMessage,
  OutboxCloseMessage,
  OutboxPublishMessage,
  OutboxResolveRelaysMessage,
  OutboxGetEventResultMessage,
  OutboxQueryResultMessage,
  OutboxEventMessage,
  OutboxClosedMessage,
  OutboxPublishResultMessage,
  OutboxResolveRelaysResultMessage,
} from './types.js';
import { hydrateResourceCache } from '../resource/shim.js';

/** Default timeout for outbox requests (30 seconds; aligns with other NAPs). */
const REQUEST_TIMEOUT_MS = 30_000;

/** Pending getEvent requests: correlation id -> resolver record. */
const pendingGetEvent = new Map<string, {
  resolve: (result: OutboxEventResult) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** Pending query requests: correlation id -> resolver record. */
const pendingQuery = new Map<string, {
  resolve: (result: OutboxResult) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** Pending publish requests: correlation id -> resolver record. */
const pendingPublish = new Map<string, {
  resolve: (result: OutboxPublishResult) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** Pending resolveRelays requests: correlation id -> resolver record. */
const pendingResolve = new Map<string, {
  resolve: (plan: OutboxRelayPlan) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** Per-subscription listener sets. */
interface SubListeners {
  event: Set<(result: RelayEventResult) => void>;
  closed: Set<(reason?: string) => void>;
}

/** Active subscriptions: subId -> listener sets. */
const subscriptions = new Map<string, SubListeners>();

/** Guard against double-install. */
let installed = false;

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

function handleGetEventResult(msg: OutboxGetEventResultMessage): void {
  const p = pendingGetEvent.get(msg.id);
  if (!p) return;
  pendingGetEvent.delete(msg.id);
  clearTimeout(p.timeout);
  const result: OutboxEventResult = {};
  if (msg.result !== undefined) {
    hydrateResourceCache(msg.result.sidecar?.resources);
    result.result = msg.result;
  }
  if (msg.incomplete !== undefined) result.incomplete = msg.incomplete;
  if (msg.error !== undefined) result.error = msg.error;
  p.resolve(result);
}

function handleQueryResult(msg: OutboxQueryResultMessage): void {
  const p = pendingQuery.get(msg.id);
  if (!p) return;
  pendingQuery.delete(msg.id);
  clearTimeout(p.timeout);
  const events = Array.isArray(msg.events) ? msg.events : [];
  for (const item of events) hydrateResourceCache(item.sidecar?.resources);
  const result: OutboxResult = {
    events,
  };
  if (msg.incomplete !== undefined) result.incomplete = msg.incomplete;
  if (msg.error !== undefined) result.error = msg.error;
  p.resolve(result);
}

function handlePublishResult(msg: OutboxPublishResultMessage): void {
  const p = pendingPublish.get(msg.id);
  if (!p) return;
  pendingPublish.delete(msg.id);
  clearTimeout(p.timeout);
  const result: OutboxPublishResult = { ok: msg.ok };
  if (msg.event !== undefined) result.event = msg.event;
  if (msg.eventId !== undefined) result.eventId = msg.eventId;
  if (msg.relays !== undefined) result.relays = msg.relays;
  if (msg.error !== undefined) result.error = msg.error;
  p.resolve(result);
}

function handleResolveResult(msg: OutboxResolveRelaysResultMessage): void {
  const p = pendingResolve.get(msg.id);
  if (!p) return;
  pendingResolve.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.error !== undefined) {
    p.reject(new Error(msg.error));
    return;
  }
  if (!msg.plan) {
    p.reject(new Error('outbox.resolveRelays.result missing plan'));
    return;
  }
  p.resolve(msg.plan);
}

function handleSubEvent(msg: OutboxEventMessage): void {
  const sub = subscriptions.get(msg.subId);
  if (!sub) return;
  hydrateResourceCache(msg.result.sidecar?.resources);
  for (const cb of sub.event) cb(msg.result);
}

function handleSubClosed(msg: OutboxClosedMessage): void {
  const sub = subscriptions.get(msg.subId);
  if (!sub) return;
  for (const cb of sub.closed) cb(msg.reason);
  // Upstream/shell closed the subscription: drop local listener state.
  subscriptions.delete(msg.subId);
}

/**
 * Handle outbox.* messages from the shell via the central message listener.
 * Covers query/publish/resolveRelays results plus event/closed lifecycle.
 */
export function handleOutboxMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<OutboxGetEventResultMessage>(msg, 'outbox.getEvent.result')) {
    handleGetEventResult(msg);
  } else if (isMessageType<OutboxQueryResultMessage>(msg, 'outbox.query.result')) {
    handleQueryResult(msg);
  } else if (isMessageType<OutboxPublishResultMessage>(msg, 'outbox.publish.result')) {
    handlePublishResult(msg);
  } else if (isMessageType<OutboxResolveRelaysResultMessage>(msg, 'outbox.resolveRelays.result')) {
    handleResolveResult(msg);
  } else if (isMessageType<OutboxEventMessage>(msg, 'outbox.event')) {
    handleSubEvent(msg);
  } else if (isMessageType<OutboxClosedMessage>(msg, 'outbox.closed')) {
    handleSubClosed(msg);
  }
}

/**
 * Fetch one event by ID through shell-owned outbox routing. The shell validates
 * that any returned event matches `eventId` and has a valid signature.
 *
 * @param eventId  Event id to fetch
 * @param options  Optional author/relay hints and timeout
 * @returns Promise resolving to the outbox event result
 *
 * @example
 * ```ts
 * const { result } = await getEvent('ev1...', { author: 'ab12...', timeoutMs: 3000 });
 * ```
 */
export function getEvent(
  eventId: string,
  options?: OutboxEventOptions,
): Promise<OutboxEventResult> {
  const id = crypto.randomUUID();
  const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
  return new Promise<OutboxEventResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingGetEvent.delete(id)) reject(new Error('outbox.getEvent timed out'));
    }, timeoutMs);
    pendingGetEvent.set(id, { resolve, reject, timeout });

    const msg: OutboxGetEventMessage = {
      type: 'outbox.getEvent',
      id,
      eventId,
      ...(options === undefined ? {} : { options }),
    };
    postToShell(msg);
  });
}

/**
 * Perform a one-shot outbox-aware query. The shell resolves the relevant relays,
 * queries them, deduplicates events by id, validates signatures, and returns the
 * collected events. Partial results arrive with `incomplete: true`; an inline
 * `error` field describes a query-level failure (the promise still resolves).
 *
 * @param filters  NIP-01 filter or filters
 * @param options  Optional query options (authors, relays, limit, timeoutMs)
 * @returns Promise resolving to the outbox result
 *
 * @example
 * ```ts
 * const { events } = await query(
 *   [{ authors: ['ab12...'], kinds: [1], limit: 20 }],
 *   { authors: ['ab12...'], timeoutMs: 3000 },
 * );
 * ```
 */
export function query(
  filters: NostrFilter | NostrFilter[],
  options?: OutboxQueryOptions,
): Promise<OutboxResult> {
  const id = crypto.randomUUID();
  const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
  return new Promise<OutboxResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingQuery.delete(id)) reject(new Error('outbox.query timed out'));
    }, timeoutMs);
    pendingQuery.set(id, { resolve, reject, timeout });

    const msg: OutboxQueryMessage = {
      type: 'outbox.query',
      id,
      filters,
      ...(options === undefined ? {} : { options }),
    };
    postToShell(msg);
  });
}

/**
 * Open a live outbox-aware subscription. Returns a handle with an event-emitter
 * `on(...)` API and `close()`. The shell may add/remove relay connections as
 * NIP-65 relay lists change.
 *
 * @param filters  NIP-01 filter or filters
 * @param options  Optional subscribe options
 * @returns An OutboxSubscription handle
 *
 * @example
 * ```ts
 * const sub = subscribe([{ authors: ['ab12...'], kinds: [1] }], { timeoutMs: 3000 });
 * sub.on('event', (result) => render(result.event, result.sidecar?.relayHints));
 * // later: sub.close();
 * ```
 */
export function subscribe(
  filters: NostrFilter | NostrFilter[],
  options?: OutboxSubscribeOptions,
): OutboxSubscription {
  const id = crypto.randomUUID();
  const subId = crypto.randomUUID();

  const listeners: SubListeners = {
    event: new Set(),
    closed: new Set(),
  };
  subscriptions.set(subId, listeners);

  const msg: OutboxSubscribeMessage = {
    type: 'outbox.subscribe',
    id,
    subId,
    filters,
    ...(options === undefined ? {} : { options }),
  };
  postToShell(msg);

  function on(event: 'event', cb: (result: RelayEventResult) => void): void;
  function on(event: 'closed', cb: (reason?: string) => void): void;
  function on(event: 'event' | 'closed', cb: (...args: never[]) => void): void {
    if (event === 'event') listeners.event.add(cb as (result: RelayEventResult) => void);
    else if (event === 'closed') listeners.closed.add(cb as (reason?: string) => void);
  }

  return {
    on,
    close(): void {
      if (!subscriptions.delete(subId)) return;
      const closeMsg: OutboxCloseMessage = {
        type: 'outbox.close',
        id: crypto.randomUUID(),
        subId,
      };
      postToShell(closeMsg);
    },
  };
}

/**
 * Publish a shell-signed event using outbox-aware relay fanout. The promise
 * resolves with the full result (including inline `ok`/`error`); it rejects only
 * if the shell never responds.
 *
 * @param template  Unsigned event template; the shell signs before fanout
 * @param options   Optional publish options (relays, targetAuthors)
 * @returns Promise resolving to the outbox publish result
 *
 * @example
 * ```ts
 * const res = await publish(
 *   { kind: 1, content: 'hello', tags: [], created_at: Math.floor(Date.now() / 1000) },
 *   { targetAuthors: ['ab12...'] },
 * );
 * ```
 */
export function publish(
  template: EventTemplate,
  options?: OutboxPublishOptions,
): Promise<OutboxPublishResult> {
  const id = crypto.randomUUID();
  return new Promise<OutboxPublishResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingPublish.delete(id)) reject(new Error('outbox.publish timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingPublish.set(id, { resolve, reject, timeout });

    const msg: OutboxPublishMessage = {
      type: 'outbox.publish',
      id,
      event: template,
      ...(options === undefined ? {} : { options }),
    };
    postToShell(msg);
  });
}

/**
 * Resolve the relay plan the shell would use for a read/write target. Useful for
 * diagnostics and UI; prefer `query`/`subscribe`/`publish` for actual access.
 *
 * @param target  The read/write target (authors/pubkey, direction)
 * @returns Promise resolving to the relay plan
 */
export function resolveRelays(target: OutboxTarget): Promise<OutboxRelayPlan> {
  const id = crypto.randomUUID();
  return new Promise<OutboxRelayPlan>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingResolve.delete(id)) reject(new Error('outbox.resolveRelays timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingResolve.set(id, { resolve, reject, timeout });

    const msg: OutboxResolveRelaysMessage = {
      type: 'outbox.resolveRelays',
      id,
      target,
    };
    postToShell(msg);
  });
}

/**
 * Install the outbox shim. Registration-only -- outbox operations are issued on
 * demand, not at install time.
 *
 * @returns cleanup function that rejects pending requests and clears all state
 */
export function installOutboxShim(): () => void {
  if (installed) {
    return () => undefined; // already installed: no-op cleanup
  }
  installed = true;
  return () => {
    for (const p of pendingGetEvent.values()) clearTimeout(p.timeout);
    for (const p of pendingQuery.values()) clearTimeout(p.timeout);
    for (const p of pendingPublish.values()) clearTimeout(p.timeout);
    for (const p of pendingResolve.values()) clearTimeout(p.timeout);
    pendingGetEvent.clear();
    pendingQuery.clear();
    pendingPublish.clear();
    pendingResolve.clear();
    subscriptions.clear();
    installed = false;
  };
}
