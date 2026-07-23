/**
 * Napplet NAP inc shim entrypoint.
 *
 * @module
 */

// @napplet/nap/inc -- INC NAP shim
// Inter-napplet communication via topic pub/sub over postMessage.

import { postToShell } from '../boundary.js';
import { normalizeConventionUri } from '../convention-uri.js';
import type { NostrEvent } from '@napplet/core';
import type {
  IncSubscribeMessage,
  IncUnsubscribeMessage,
  IncEventMessage,
} from './types.js';

/** Map of topic -> array of callbacks for INC event dispatch. */
const incTopicHandlers = new Map<string, Array<(payload: unknown, sender: string) => void>>();

/**
 * Normalize documented convention URIs before emission. All other topics remain
 * opaque to INC and retain their exact caller-provided text.
 */
function transposeConventionUri(topic: string, payload: unknown) {
  const queryIndex = topic.indexOf('?');
  const fragmentIndex = topic.indexOf('#');
  const pathEnd = [queryIndex, fragmentIndex]
    .filter((index) => index >= 0)
    .reduce((end, index) => Math.min(end, index), topic.length);
  const convention = topic.slice(0, pathEnd);
  const isConventionUri = /^napplet:[^/?#]+\/[^/?#]+$/.test(convention);

  if (!isConventionUri) {
    return {
      type: 'inc.emit',
      topic,
      ...(payload !== undefined ? { payload } : {}),
    };
  }

  const normalized = normalizeConventionUri(topic, payload);

  return {
    type: 'inc.emit',
    topic: normalized.convention,
    ...(normalized.payload !== undefined ? { payload: normalized.payload } : {}),
  };
}

/**
 * Convention consumers subscribe only to the stable routed identity. Query
 * transposition belongs exclusively to emit; receive-side matching stays exact.
 */
function assertStableSubscriptionTopic(topic: string): void {
  const queryIndex = topic.indexOf('?');
  const fragmentIndex = topic.indexOf('#');
  if (queryIndex < 0 && fragmentIndex < 0) return;

  const pathEnd = [queryIndex, fragmentIndex]
    .filter((index) => index >= 0)
    .reduce((end, index) => Math.min(end, index), topic.length);
  const stableTopic = topic.slice(0, pathEnd);
  if (/^napplet:[^/?#]+\/[^/?#]+$/.test(stableTopic)) {
    throw new Error(
      'Convention subscriptions must use the stable queryless topic',
    );
  }
}

/**
 * Broadcast an INC message to other napplets via the shell.
 *
 * Sends an `inc.emit` envelope message to the shell for delivery
 * to matching topic subscribers.
 *
 * A queried `napplet:<archetype>/<intent>` convention URI is transposed into a
 * stable topic plus shallow text payload before the shell receives it.
 *
 * @param topic    An opaque stable topic or convention URI
 * @param payload  Optional opaque payload for a queryless topic
 *
 * @example
 * ```ts
 * emit('napplet:profile/open', { pubkey: '...' });
 * ```
 */
export function emit(topic: string, payload?: unknown): void {
  postToShell(transposeConventionUri(topic, payload));
}

/**
 * Subscribe to INC events on a specific topic.
 *
 * Sends an `inc.subscribe` envelope message to the shell and registers
 * a local handler for `inc.event` messages on that topic.
 *
 * @param topic    The topic string to listen for
 * @param callback Called with `(payload, event)` for each matching event.
 *                 `payload` is the parsed content (or `{}` if unavailable).
 * @returns Object with `close()` method to unsubscribe
 *
 * @example
 * ```ts
 * const sub = on('napplet:profile/open', (payload) => {
 *   console.log('Profile requested:', payload.pubkey);
 * });
 * // Later: sub.close();
 * ```
 */
export function on(
  topic: string,
  callback: (payload: unknown, event: NostrEvent) => void,
): { close(): void } {
  assertStableSubscriptionTopic(topic);

  // Register local handler -- construct a synthetic NostrEvent-like wrapper
  // from INC envelope for backward compatibility with the window.napplet type
  const handler = (payload: unknown, sender: string) => {
    const syntheticEvent: NostrEvent = {
      id: '',
      pubkey: sender,
      created_at: Math.floor(Date.now() / 1000),
      kind: 0,
      tags: [['t', topic]],
      content: typeof payload === 'string' ? payload : JSON.stringify(payload ?? {}),
      sig: '',
    };
    callback(payload, syntheticEvent);
  };
  if (!incTopicHandlers.has(topic)) {
    incTopicHandlers.set(topic, []);
  }
  incTopicHandlers.get(topic)!.push(handler);

  // Send subscription request to shell
  const subscribeMsg: IncSubscribeMessage = {
    type: 'inc.subscribe',
    id: crypto.randomUUID(),
    topic,
  };
  postToShell(subscribeMsg);

  return {
    close(): void {
      const handlers = incTopicHandlers.get(topic);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
        if (handlers.length === 0) incTopicHandlers.delete(topic);
      }

      // Send unsubscribe to shell
      const unsubMsg: IncUnsubscribeMessage = {
        type: 'inc.unsubscribe',
        topic,
      };
      postToShell(unsubMsg);
    },
  };
}

/**
 * Handle inc.event messages from the shell.
 * Dispatches to registered topic handlers.
 */
export function handleIncEvent(msg: IncEventMessage): void {
  const handlers = incTopicHandlers.get(msg.topic);
  if (handlers) {
    const payload = msg.payload ?? {};
    const sender = msg.sender ?? '';
    for (const handler of handlers) {
      handler(payload, sender);
    }
  }
}

/**
 * Install the INC shim.
 * Called by @napplet/shim during initialization.
 *
 * @returns cleanup function
 */
export function installIncShim(): () => void {
  return () => {
    incTopicHandlers.clear();
  };
}
