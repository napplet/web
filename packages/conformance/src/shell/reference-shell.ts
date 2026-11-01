/**
 * @napplet/conformance -- Reference mock shell.
 *
 * @packageDocumentation
 */

import {
  REFERENCE_ENDPOINT,
  type ReferenceEndpoint,
} from './reference-responses.js';
import {
  createReferenceHandler,
  type RecordedEnvelope,
} from './reference-handler.js';
import { createIntentHandlers } from './reference-intents.js';
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
  const handleFrom = createReferenceHandler({
    now: options.now ?? Date.now,
    records,
    domains: options.domains,
    queueDelivery: deliveries.queue,
    intents: createIntentHandlers(deliveries.queue, options.manifests, options.defaults),
  });

  return {
    get records() {
      return records;
    },
    handle: (envelope) => handleFrom(REFERENCE_ENDPOINT, envelope),
    handleFrom,
    takeDeliveries: deliveries.take,
    reset() {
      records.length = 0;
      handleFrom.reset();
      deliveries.clear();
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
