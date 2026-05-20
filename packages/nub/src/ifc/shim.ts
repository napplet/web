// @napplet/nub/ifc -- IFC NUB shim
// Inter-frame communication via topic pub/sub over postMessage.

import type { NostrEvent } from '@napplet/core';
import type {
  IfcEmitMessage,
  IfcSubscribeMessage,
  IfcUnsubscribeMessage,
  IfcEventMessage,
} from './types.js';

// ─── IFC topic subscription registry ────────────────────────────────────────

/** Map of topic -> array of callbacks for IFC event dispatch. */
const ifcTopicHandlers = new Map<string, Array<(payload: unknown, sender: string) => void>>();

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Broadcast an IFC event to other napplets via the shell.
 *
 * Sends an `ifc.emit` envelope message to the shell for delivery
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

  const msg: IfcEmitMessage = {
    type: 'ifc.emit',
    topic,
    ...(payload !== undefined ? { payload } : {}),
  };
  window.parent.postMessage(msg, '*');
}

/**
 * Subscribe to IFC events on a specific topic.
 *
 * Sends an `ifc.subscribe` envelope message to the shell and registers
 * a local handler for `ifc.event` messages on that topic.
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
  // from IFC envelope for backward compatibility with the window.napplet type
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
  if (!ifcTopicHandlers.has(topic)) {
    ifcTopicHandlers.set(topic, []);
  }
  ifcTopicHandlers.get(topic)!.push(handler);

  // Send subscription request to shell
  const subscribeMsg: IfcSubscribeMessage = {
    type: 'ifc.subscribe',
    id: crypto.randomUUID(),
    topic,
  };
  window.parent.postMessage(subscribeMsg, '*');

  return {
    close(): void {
      // Remove local handler
      const handlers = ifcTopicHandlers.get(topic);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
        if (handlers.length === 0) ifcTopicHandlers.delete(topic);
      }

      // Send unsubscribe to shell
      const unsubMsg: IfcUnsubscribeMessage = {
        type: 'ifc.unsubscribe',
        topic,
      };
      window.parent.postMessage(unsubMsg, '*');
    },
  };
}

// ─── IFC event handler (shell -> napplet) ──────────────────────────────────

/**
 * Handle ifc.event messages from the shell.
 * Dispatches to registered topic handlers.
 */
export function handleIfcEvent(msg: IfcEventMessage): void {
  const handlers = ifcTopicHandlers.get(msg.topic);
  if (handlers) {
    const payload = msg.payload ?? {};
    const sender = msg.sender ?? '';
    for (const handler of handlers) {
      handler(payload, sender);
    }
  }
}

// ─── Shim installer ────────────────────────────────────────────────────────

/**
 * Install the IFC shim.
 * Called by @napplet/shim during initialization.
 *
 * @returns cleanup function
 */
export function installIfcShim(): () => void {
  return () => {
    ifcTopicHandlers.clear();
  };
}
