/**
 * Napplet NAP inc shim entrypoint.
 *
 * @module
 */

// @napplet/nap/inc -- INC NAP shim
// Inter-napplet communication via topic pub/sub over postMessage.

import { postToShell } from '../boundary.js';
import type { NostrEvent } from '@napplet/core';
import type {
  IncEmitMessage,
  IncSubscribeMessage,
  IncUnsubscribeMessage,
  IncEventMessage,
} from './types.js';

/** Map of topic -> array of callbacks for INC event dispatch. */
const incTopicHandlers = new Map<string, Array<(payload: unknown, sender: string) => void>>();

/**
 * Transpose a queried convention URI into the stable topic and text payload the
 * shell routes. All non-convention topics remain opaque to the runtime.
 */
function transposeConventionUri(topic: string, payload: unknown): IncEmitMessage {
  const queryIndex = topic.indexOf('?');
  const fragmentIndex = topic.indexOf('#');
  const pathEnd = [queryIndex, fragmentIndex]
    .filter((index) => index >= 0)
    .reduce((end, index) => Math.min(end, index), topic.length);
  const stableTopic = topic.slice(0, pathEnd);
  const isConventionUri = /^napplet:[^/?#]+\/[^/?#]+$/.test(stableTopic);

  if (!isConventionUri) {
    return {
      type: 'inc.emit',
      topic,
      ...(payload !== undefined ? { payload } : {}),
    };
  }

  if (fragmentIndex >= 0) {
    throw new Error('Convention URI fragments are not supported by inc.emit');
  }

  if (queryIndex < 0) {
    return {
      type: 'inc.emit',
      topic,
      ...(payload !== undefined ? { payload } : {}),
    };
  }

  if (payload !== undefined) {
    throw new Error('Convention URI queries cannot be combined with an explicit payload');
  }

  const entries: Array<[string, string]> = [];
  const names = new Set<string>();
  const query = topic.slice(queryIndex + 1);

  if (query) {
    for (const pair of query.split('&')) {
      const separator = pair.indexOf('=');
      if (separator < 0) {
        throw new Error('Convention URI query parameters must use name=value form');
      }

      const name = decodeURIComponent(pair.slice(0, separator));
      const value = decodeURIComponent(pair.slice(separator + 1));
      if (names.has(name)) {
        throw new Error('Convention URI query parameter names must be unique');
      }
      names.add(name);
      entries.push([name, value]);
    }
  }

  return {
    type: 'inc.emit',
    topic: stableTopic,
    payload: Object.fromEntries(entries),
  };
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
 * const sub = on('profile:open', (payload) => {
 *   console.log('Profile requested:', payload.pubkey);
 * });
 * // Later: sub.close();
 * ```
 */
export function on(
  topic: string,
  callback: (payload: unknown, event: NostrEvent) => void,
): { close(): void } {
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
