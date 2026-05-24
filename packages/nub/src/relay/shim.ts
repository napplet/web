// @napplet/nub/relay -- Relay NUB shim
// JSON envelope wire format over postMessage to the shell.

import type { NostrEvent, NostrFilter, Subscription, EventTemplate } from '@napplet/core';
import type {
  RelaySubscribeMessage,
  RelayCloseMessage,
  RelayPublishMessage,
  RelayPublishResultMessage,
  RelayPublishEncryptedMessage,
  RelayPublishEncryptedResultMessage,
  RelayQueryMessage,
  RelayEventMessage,
  RelayEoseMessage,
  RelayClosedMessage,
  RelayQueryResultMessage,
} from './types.js';
import { hydrateResourceCache } from '../resource/shim.js';

/**
 * Open a live relay subscription through the shell's relay pool.
 *
 * Sends a `relay.subscribe` envelope message via postMessage to the parent shell.
 * The shell queries its local cache and connected relays, streaming
 * matching events back via `relay.event` messages.
 *
 * @param filters   One or more NIP-01 subscription filters
 * @param onEvent   Called for each matching event delivered by the shell
 * @param onEose    Called when the shell signals end of stored events (EOSE)
 * @param options   Optional: `{ relay, group }` for scoped relay subscriptions
 * @returns A Subscription handle with a `close()` method to tear down the subscription
 *
 * @example
 * ```ts
 * const sub = subscribe(
 *   { kinds: [1], limit: 20 },
 *   (event) => console.log('Got event:', event),
 *   () => console.log('EOSE'),
 * );
 * // Later: sub.close();
 * ```
 */
export function subscribe(
  filters: NostrFilter | NostrFilter[],
  onEvent: (event: NostrEvent) => void,
  onEose: () => void,
  options?: { relay?: string; group?: string },
): Subscription {
  const normalizedFilters = Array.isArray(filters) ? filters : [filters];
  const subId = crypto.randomUUID();

  function handleMessage(msgEvent: MessageEvent): void {
    if (msgEvent.source !== window.parent) return;
    const msg = msgEvent.data;
    if (typeof msg !== 'object' || msg === null || typeof msg.type !== 'string') return;
    if (!msg.type.startsWith('relay.')) return;

    const typedMsg = msg as RelayEventMessage | RelayEoseMessage | RelayClosedMessage;
    if (!('subId' in typedMsg) || typedMsg.subId !== subId) return;

    if (msg.type === 'relay.event') {
      const eventMsg = msg as RelayEventMessage;
      hydrateResourceCache(eventMsg.resources);
      onEvent(eventMsg.event);
    } else if (msg.type === 'relay.eose') {
      onEose();
    } else if (msg.type === 'relay.closed') {
      window.removeEventListener('message', handleMessage);
    }
  }

  window.addEventListener('message', handleMessage);

  // Send relay.subscribe envelope (handles both standard and scoped relay)
  const subscribeMsg: RelaySubscribeMessage = {
    type: 'relay.subscribe',
    id: crypto.randomUUID(),
    subId,
    filters: normalizedFilters,
    ...(options?.relay ? { relay: options.relay } : {}),
  };
  window.parent.postMessage(subscribeMsg, '*');

  return {
    close(): void {
      const closeMsg: RelayCloseMessage = {
        type: 'relay.close',
        id: crypto.randomUUID(),
        subId,
      };
      window.parent.postMessage(closeMsg, '*');
      window.removeEventListener('message', handleMessage);
    },
  };
}


/**
 * Publish a Nostr event through the shell.
 *
 * The event template is sent to the shell via a `relay.publish` envelope
 * message. The shell signs the event and broadcasts it to relays.
 * Napplets never have direct access to signing keys.
 *
 * @param template  Unsigned event template (kind, content, tags, created_at)
 * @param options   Optional: `{ relay: true }` to publish via the scoped relay instead of the shared pool
 * @returns The signed NostrEvent after successful publication
 *
 * @example
 * ```ts
 * const signed = await publish({
 *   kind: 1,
 *   content: 'Hello Nostr!',
 *   tags: [],
 *   created_at: Math.floor(Date.now() / 1000),
 * });
 * ```
 */
export function publish(
  template: EventTemplate,
  _options?: { relay?: boolean },
): Promise<NostrEvent> {
  const publishId = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    function handleMessage(msgEvent: MessageEvent): void {
      if (msgEvent.source !== window.parent) return;
      const msg = msgEvent.data;
      if (typeof msg !== 'object' || msg === null || typeof msg.type !== 'string') return;
      if (msg.type !== 'relay.publish.result' && msg.type !== 'relay.publish.error') return;

      const result = msg as RelayPublishResultMessage;
      if (result.id !== publishId) return;

      window.removeEventListener('message', handleMessage);
      if (result.error || msg.type === 'relay.publish.error') {
        reject(new Error(result.error || 'relay:write denied'));
      } else if (!result.event) {
        reject(new Error('relay.publish.result missing event'));
      } else {
        resolve(result.event);
      }
    }

    window.addEventListener('message', handleMessage);

    const publishMsg: RelayPublishMessage = {
      type: 'relay.publish',
      id: publishId,
      event: template as NostrEvent,
    };
    window.parent.postMessage(publishMsg, '*');
  });
}

/**
 * Publish an encrypted Nostr event through the shell.
 *
 * The shell encrypts the event content using the specified scheme (NIP-44 or NIP-04),
 * signs the event, and broadcasts it. Napplets never have direct access to encryption
 * keys -- this ensures the shell can inspect content before encryption.
 *
 * @param template    Unsigned event template (kind, content, tags, created_at)
 * @param recipient   Hex-encoded recipient public key
 * @param encryption  Encryption scheme: 'nip44' (default) or 'nip04'
 * @returns The signed encrypted NostrEvent after successful publication
 *
 * @example
 * ```ts
 * const signed = await publishEncrypted(
 *   { kind: 4, content: 'secret', tags: [], created_at: now },
 *   'recipientPubkey...',
 *   'nip44',
 * );
 * ```
 */
export function publishEncrypted(
  template: EventTemplate,
  recipient: string,
  encryption: 'nip44' | 'nip04' = 'nip44',
): Promise<NostrEvent> {
  const requestId = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    function handleMessage(msgEvent: MessageEvent): void {
      if (msgEvent.source !== window.parent) return;
      const msg = msgEvent.data;
      if (typeof msg !== 'object' || msg === null || typeof msg.type !== 'string') return;
      if (msg.type !== 'relay.publishEncrypted.result') return;

      const result = msg as RelayPublishEncryptedResultMessage;
      if (result.id !== requestId) return;

      window.removeEventListener('message', handleMessage);
      if (result.error) {
        reject(new Error(result.error));
      } else if (!result.event) {
        reject(new Error('relay.publishEncrypted.result missing event'));
      } else {
        resolve(result.event);
      }
    }

    window.addEventListener('message', handleMessage);

    const msg: RelayPublishEncryptedMessage = {
      type: 'relay.publishEncrypted',
      id: requestId,
      event: template,
      recipient,
      encryption,
    };
    window.parent.postMessage(msg, '*');
  });
}

/**
 * One-shot query: send a relay.query message, await relay.query.result, resolve.
 *
 * Uses the dedicated `relay.query` envelope message for a cleaner protocol
 * instead of subscribe + collect + close.
 *
 * @param filters  NIP-01 subscription filters (single or array)
 * @returns Promise resolving to an array of matching NostrEvent objects
 *
 * @example
 * ```ts
 * const profiles = await query({ kinds: [0], authors: [pubkey] });
 * ```
 */
export function query(filters: NostrFilter | NostrFilter[]): Promise<NostrEvent[]> {
  const normalizedFilters = Array.isArray(filters) ? filters : [filters];
  const queryId = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    function handleMessage(msgEvent: MessageEvent): void {
      if (msgEvent.source !== window.parent) return;
      const msg = msgEvent.data;
      if (typeof msg !== 'object' || msg === null || typeof msg.type !== 'string') return;
      if (msg.type !== 'relay.query.result') return;

      const result = msg as RelayQueryResultMessage;
      if (result.id !== queryId) return;

      window.removeEventListener('message', handleMessage);
      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result.events);
      }
    }

    window.addEventListener('message', handleMessage);

    const queryMsg: RelayQueryMessage = {
      type: 'relay.query',
      id: queryId,
      filters: normalizedFilters,
    };
    window.parent.postMessage(queryMsg, '*');
  });
}

/**
 * Install the relay shim on window.napplet.relay.
 *
 * Called by @napplet/shim during initialization.
 * Provides subscribe, publish, and query methods on the relay namespace.
 *
 * @returns cleanup function
 */
export function installRelayShim(): () => void {
  return () => {
    /* Relay shim has no persistent listeners to clean up --
       each subscribe/query manages its own listener lifecycle. */
  };
}
