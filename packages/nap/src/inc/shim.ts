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
 * Broadcast an INC event to other napplets via the shell.
 *
 * Sends an `inc.emit` envelope message to the shell for delivery
 * to matching topic subscribers.
 *
 * @param topic     The topic string (e.g., 'profile:open', 'stream:channel-switch')
 * @param extraTags Additional tags (legacy parameter -- ignored in envelope format)
 * @param content   Event content string (sent as payload)
 *
 * @example
 * ```ts
 * emit('profile:open', [], JSON.stringify({ pubkey: '...' }));
 * ```
 */
export function emit(
  topic: string,
  extraTags: string[][] = [],
  content: string = '',
): void {
  let payload: unknown;
  try {
    payload = content ? JSON.parse(content) : undefined;
  } catch {
    payload = content || undefined;
  }

  const msg: IncEmitMessage = {
    type: 'inc.emit',
    topic,
    ...(payload !== undefined ? { payload } : {}),
  };
  postToShell(msg);
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
