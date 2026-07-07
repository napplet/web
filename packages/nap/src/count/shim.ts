/**
 * Napplet NAP count shim entrypoint.
 *
 * @module
 */

// @napplet/nap/count -- Runtime-mediated event count shim.
// Correlates count.query request/result envelopes; the runtime owns counting.

import { postToShell } from '../boundary.js';
import type { CountFilter, CountOptions, CountResult } from '@napplet/core';
import type { CountQueryMessage, CountQueryResultMessage } from './types.js';

/** Default timeout for count.query request-responses. */
const REQUEST_TIMEOUT_MS = 30_000;

const pendingQuery = new Map<string, {
  resolve: (result: CountResult) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

let installed = false;

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

function normalizeFilters(filters: CountFilter | CountFilter[]): CountFilter[] {
  return Array.isArray(filters) ? filters : [filters];
}

function handleQueryResult(msg: CountQueryResultMessage): void {
  const pending = pendingQuery.get(msg.id);
  if (!pending) return;
  pendingQuery.delete(msg.id);
  clearTimeout(pending.timeout);
  pending.resolve({
    ok: msg.ok,
    ...(msg.count === undefined ? {} : { count: msg.count }),
    ...(msg.approximate === undefined ? {} : { approximate: msg.approximate }),
    ...(msg.hll === undefined ? {} : { hll: msg.hll }),
    ...(msg.relays === undefined ? {} : { relays: msg.relays }),
    ...(msg.error === undefined ? {} : { error: msg.error }),
    ...(msg.reason === undefined ? {} : { reason: msg.reason }),
  });
}

/**
 * Handle count.* messages from the shell via the central message listener.
 *
 * @param msg  The shell envelope to route
 */
export function handleCountMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<CountQueryResultMessage>(msg, 'count.query.result')) {
    handleQueryResult(msg);
  }
}

/**
 * Ask the runtime to count events matching NIP-01 filters.
 *
 * Multiple filters are sent as one non-empty filter array. The runtime preserves
 * NIP-45 OR semantics and returns count metadata, never matching event payloads.
 *
 * @param filters  One NIP-01 filter or a non-empty array of filters
 * @param options  Optional approximation and HyperLogLog hints
 * @returns Promise resolving to the runtime count result
 *
 * @example
 * ```ts
 * const result = await query({ kinds: [7], '#e': [eventId] });
 * ```
 */
export function query(
  filters: CountFilter | CountFilter[],
  options?: CountOptions,
): Promise<CountResult> {
  const normalizedFilters = normalizeFilters(filters);
  if (normalizedFilters.length === 0) {
    return Promise.reject(new Error('count.query requires at least one filter'));
  }

  const id = crypto.randomUUID();
  return new Promise<CountResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingQuery.delete(id)) reject(new Error('count.query timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingQuery.set(id, { resolve, reject, timeout });

    const msg: CountQueryMessage = {
      type: 'count.query',
      id,
      filters: normalizedFilters,
      ...(options ? { options } : {}),
    };
    postToShell(msg);
  });
}

/**
 * Install the count shim. Registration-only -- count requests are sent on demand.
 *
 * @returns cleanup function that clears pending requests
 */
export function installCountShim(): () => void {
  if (installed) {
    return () => undefined;
  }
  installed = true;
  return () => {
    for (const pending of pendingQuery.values()) clearTimeout(pending.timeout);
    pendingQuery.clear();
    installed = false;
  };
}
