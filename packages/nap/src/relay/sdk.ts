/**
 * @napplet/nap/relay -- SDK helpers wrapping window.napplet.relay.
 *
 * These convenience functions delegate to `window.napplet.relay.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type {
  NappletGlobal,
  NostrEvent,
  NostrFilter,
  RelayEventResult,
  Subscription,
  EventTemplate,
} from '@napplet/core';

function requireRelay(): NonNullable<NappletGlobal['relay']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.relay) {
    throw new Error('window.napplet.relay is unavailable -- runtime did not inject the relay domain');
  }
  return w.napplet.relay;
}

/**
 * Open a live NIP-01 subscription through the shell's relay pool.
 *
 * @param filters  One or more NIP-01 subscription filters
 * @param onEvent  Called for each matching event result
 * @param onEose   Called when the shell signals end of stored events (EOSE)
 * @param options  Optional: `{ relay, group }` for NIP-29 scoped relay subscriptions
 * @returns A Subscription handle with a `close()` method
 *
 * @example
 * ```ts
 * import { relaySubscribe } from '@napplet/nap/relay';
 *
 * const sub = relaySubscribe(
 *   { kinds: [1], limit: 10 },
 *   (event) => console.log(event),
 *   () => console.log('EOSE'),
 * );
 * ```
 */
export function relaySubscribe(
  filters: NostrFilter | NostrFilter[],
  onEvent: (result: RelayEventResult) => void,
  onEose: () => void,
  options?: { relay?: string; group?: string },
): Subscription {
  return requireRelay().subscribe(filters, onEvent, onEose, options);
}

/**
 * Sign and publish a Nostr event through the shell.
 *
 * @param template  Unsigned event template
 * @param options   Optional: `{ relay: true }` to publish via scoped relay
 * @returns The signed NostrEvent after successful publication
 *
 * @example
 * ```ts
 * import { relayPublish } from '@napplet/nap/relay';
 *
 * const signed = await relayPublish({
 *   kind: 1, content: 'Hello!', tags: [],
 *   created_at: Math.floor(Date.now() / 1000),
 * });
 * ```
 */
export function relayPublish(
  template: EventTemplate,
  options?: { relay?: boolean },
): Promise<NostrEvent> {
  return requireRelay().publish(template, options);
}

/**
 * One-shot query: subscribe, collect events until EOSE, then resolve.
 *
 * @param filters  NIP-01 subscription filters
 * @returns Promise resolving to array of matching event results
 *
 * @example
 * ```ts
 * import { relayQuery } from '@napplet/nap/relay';
 *
 * const profiles = await relayQuery({ kinds: [0], authors: [pubkey] });
 * ```
 */
export function relayQuery(filters: NostrFilter | NostrFilter[]): Promise<RelayEventResult[]> {
  return requireRelay().query(filters);
}

/**
 * Publish an encrypted Nostr event through the shell.
 *
 * @param template    Unsigned event template
 * @param recipient   Hex-encoded recipient public key
 * @param encryption  Encryption scheme: 'nip44' (default) or 'nip04'
 * @returns The signed encrypted NostrEvent after successful publication
 *
 * @example
 * ```ts
 * import { relayPublishEncrypted } from '@napplet/nap/relay';
 *
 * const signed = await relayPublishEncrypted(
 *   { kind: 4, content: 'secret', tags: [], created_at: now },
 *   'recipientPubkey...',
 * );
 * ```
 */
export function relayPublishEncrypted(
  template: EventTemplate,
  recipient: string,
  encryption: 'nip44' | 'nip04' = 'nip44',
): Promise<NostrEvent> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.relay?.publishEncrypted) {
    throw new Error('window.napplet.relay.publishEncrypted is unavailable -- runtime did not inject the relay domain');
  }
  return w.napplet.relay.publishEncrypted(template, recipient, encryption);
}
