/**
 * @napplet/conformance -- Reference mock shell.
 *
 * @packageDocumentation
 */

import {
  REFERENCE_ENDPOINT,
  REFERENCE_MANIFEST,
  type ReferenceEndpoint,
} from './reference-responses.js';
import {
  createReferenceHandler,
  type RecordedEnvelope,
} from './reference-handler.js';
import { createIntentHandlers } from './reference-intents.js';
import { createEndpointRegistry } from './reference-endpoints.js';
import { createReferenceNavigation, type ReferenceNavigationOptions } from './reference-navigation.js';
import type { IntentDelivery, IntentRequest, NavigationResult, NavigationView } from '@napplet/core';
import { bindNappletPort, type MessageWindowLike, type PortBinding, type TransportViolation } from './port-binding.js';

export { bindNappletPort, NAPPLET_HELLO } from './port-binding.js';
export type { MessageWindowLike, PortBinding, PortBindingOptions, TransportViolation } from './port-binding.js';

export { REFERENCE_PUBKEY, REFERENCE_ENDPOINT } from './reference-responses.js';
export type { ReferenceEndpoint } from './reference-responses.js';
export type { RecordedEnvelope } from './reference-handler.js';

/** Options for {@link createReferenceShell}. */
export interface ReferenceShellOptions {
  /** Injectable clock for deterministic tests. Defaults to `Date.now`. */
  now?: () => number;
  /** Host domain ceiling. Use the same resolved set as the injected prelude. Omit for all-domain conformance. */
  domains?: readonly string[];
  /** Already verified installed metadata for catalog tests. */
  manifests?: readonly import('./intent-catalog.js').CatalogManifest[];
  /** User preferences, keyed by role. */
  defaults?: Readonly<Record<string, string>>;
  /** Reference history limits and shell policy. */
  navigation?: ReferenceNavigationOptions;
}

/** A reference shell instance for transport-agnostic conformance tests. */
export interface ReferenceShell {
  /** All envelopes recorded so far, in arrival order. */
  readonly records: readonly RecordedEnvelope[];
  /**
   * Process an inbound envelope as the default reference endpoint.
   * @param envelope Raw message emitted by the napplet.
   * @returns Response envelopes to deliver to the napplet.
   */
  handle(envelope: unknown): unknown[];
  /**
   * Process an inbound envelope from an authenticated endpoint.
   * @param endpoint Authenticated source identity.
   * @param envelope Raw message emitted by the napplet.
   * @returns Response envelopes to deliver to the napplet.
   */
  handleFrom(endpoint: ReferenceEndpoint, envelope: unknown): unknown[];
  /** Drain retained target deliveries for one resolved reference target. */
  takeDeliveries(target: string): unknown[];
  /** Bind already authenticated endpoint metadata; a terminated id cannot be reused. */
  registerEndpoint(endpoint: ReferenceEndpoint): boolean;
  /** Deliver a normalized shell intent to this live endpoint only. */
  deliverIntent(endpointId: string, request: IntentRequest): IntentDelivery | undefined;
  /** Retry an issued logical delivery without changing its id or content. */
  retryIntent(endpointId: string, deliveryId: string): boolean;
  /** Request a retained visit; this is shell control, not a wire operation. */
  revisit(endpointId: string, entryId: string): NavigationResult;
  /** Read runtime history for shell UI. */
  navigationView(endpointId: string): NavigationView;
  /** Retain selected visits under shell policy, explicitly clearing removed positions. */
  pruneNavigation(endpointId: string, keepIds: readonly string[]): NavigationView;
  /** Resolve a failed dispatch; definite means no delivery could have occurred. */
  failNavigationDelivery(endpointId: string, deliveryId: string, definite?: boolean): void;
  /** End live authority and discard retained deliveries and history. */
  terminateEndpoint(endpointId: string): void;
  /** Clear recorded envelopes. */
  reset(): void;
}

/**
 * Create a reference shell that records envelopes and returns canned responses.
 * @param options Optional deterministic clock.
 * @returns A transport-agnostic reference shell.
 * @example
 * ```ts
 * const shell = createReferenceShell();
 * shell.handle({ type: 'storage.get', id: 'request', key: 'setting' });
 * ```
 */
export function createReferenceShell(options: ReferenceShellOptions = {}): ReferenceShell {
  const records: RecordedEnvelope[] = [];
  const deliveries = createDeliveryQueue();
  const endpoints = createEndpointRegistry(options.manifests ?? [REFERENCE_MANIFEST]);
  const intents = createIntentHandlers(deliveries.queue, endpoints, options.manifests, options.defaults);
  const navigation = createReferenceNavigation(endpoints, intents, options.now ?? Date.now, options.navigation);
  const handler = createReferenceHandler({
    now: options.now ?? Date.now,
    records,
    domains: options.domains,
    queueDelivery: deliveries.queue,
    intents,
    navigation,
  });
  const handleFrom = (endpoint: ReferenceEndpoint, envelope: unknown): unknown[] => {
    const bound = endpoints.register(endpoint);
    return bound ? handler(bound.endpoint, envelope) : [];
  };

  return {
    get records() { return records; },
    handle: (envelope) => handleFrom(REFERENCE_ENDPOINT, envelope),
    handleFrom,
    takeDeliveries: deliveries.take,
    registerEndpoint: (endpoint) => !!endpoints.register(endpoint),
    deliverIntent(endpointId, request) {
      const delivery = intents.deliver(endpointId, request);
      if (delivery) intents.emit(endpointId, delivery);
      return delivery;
    },
    retryIntent: intents.retry,
    revisit: navigation.revisit,
    navigationView: navigation.view,
    pruneNavigation: navigation.prune,
    failNavigationDelivery(endpointId, deliveryId, definite = false) {
      deliveries.remove(endpointId, deliveryId);
      navigation.deliveryFailed(endpointId, deliveryId, definite);
    },
    terminateEndpoint(endpointId) {
      endpoints.terminate(endpointId);
      navigation.terminate(endpointId);
      deliveries.take(endpointId);
    },
    reset() {
      records.length = 0;
      handler.reset();
      deliveries.clear();
      navigation.clearPending();
    },
  };
}

function createDeliveryQueue() {
  const queues = new Map<string, unknown[]>();
  return {
    queue(target: string, delivery: unknown): void {
      const queue = queues.get(target);
      if (queue) queue.push(delivery);
      else queues.set(target, [delivery]);
    },
    take(target: string): unknown[] {
      const queue = queues.get(target) ?? [];
      queues.delete(target);
      return queue;
    },
    remove(target: string, deliveryId: string): void {
      const queue = queues.get(target);
      if (queue) queues.set(target, queue.filter((envelope) => (envelope as { delivery?: { id?: string } }).delivery?.id !== deliveryId));
    },
    clear(): void {
      queues.clear();
    },
  };
}

/** Options for {@link attachReferenceShell}. */
export interface AttachOptions {
  /** Window that receives the frame's window-level messages (the `napplet.hello` handoff). */
  host: MessageWindowLike;
  /** The `contentWindow` of the iframe the shell created. */
  expectedSource: unknown;
  /** Authenticated endpoint for accepted messages. */
  endpoint?: ReferenceEndpoint;
  /** Called when the binding is revoked; remove the frame here. */
  onRevoke?(violation: TransportViolation): void;
}

/**
 * Bind a {@link ReferenceShell} to a napplet frame the NIP-5D way: accept one
 * `napplet.hello` from `expectedSource`, answer NAP messages over its port, and
 * revoke on a second hello, any other window-level message or the port closing.
 * Report a second frame `load` with the returned binding's `revoke`.
 * @param shell The reference shell.
 * @param options Host window, frame source and endpoint.
 * @returns The live port binding; call `detach()` to stop.
 * @example
 * ```ts
 * const binding = attachReferenceShell(shell, { host: window, expectedSource: iframe.contentWindow, onRevoke: () => iframe.remove() });
 * ```
 */
export function attachReferenceShell(shell: ReferenceShell, options: AttachOptions): PortBinding {
  return bindNappletPort({
    host: options.host,
    source: options.expectedSource,
    onMessage: (envelope) => shell.handleFrom(options.endpoint ?? REFERENCE_ENDPOINT, envelope),
    onRevoke: options.onRevoke,
  });
}
