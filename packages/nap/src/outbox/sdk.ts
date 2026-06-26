/**
 * @napplet/nap/outbox -- SDK helpers wrapping window.napplet.outbox.
 *
 * These convenience functions delegate to `window.napplet.outbox.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal, NostrFilter, EventTemplate } from '@napplet/core';
import type {
  OutboxQueryOptions,
  OutboxSubscribeOptions,
  OutboxPublishOptions,
  OutboxTarget,
  OutboxRelayPlan,
  OutboxResult,
  OutboxPublishResult,
  OutboxSubscription,
} from './types.js';

function requireOutbox(): NonNullable<NappletGlobal['outbox']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.outbox) {
    throw new Error('window.napplet.outbox is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.outbox;
}

/**
 * Perform a one-shot outbox-aware query.
 *
 * @param filters  NIP-01 filter or filters
 * @param options  Optional query options
 * @returns Promise resolving to the outbox result
 *
 * @example
 * ```ts
 * import { outboxQuery } from '@napplet/nap/outbox';
 *
 * const { events } = await outboxQuery([{ authors: ['ab12...'], kinds: [1] }]);
 * ```
 */
export function outboxQuery(
  filters: NostrFilter | NostrFilter[],
  options?: OutboxQueryOptions,
): Promise<OutboxResult> {
  return requireOutbox().query(filters, options);
}

/**
 * Open a live outbox-aware subscription.
 *
 * @param filters  NIP-01 filter or filters
 * @param options  Optional subscribe options
 * @returns An OutboxSubscription handle
 *
 * @example
 * ```ts
 * import { outboxSubscribe } from '@napplet/nap/outbox';
 *
 * const sub = outboxSubscribe([{ kinds: [1] }], { live: true });
 * sub.on('event', (event) => render(event));
 * ```
 */
export function outboxSubscribe(
  filters: NostrFilter | NostrFilter[],
  options?: OutboxSubscribeOptions,
): OutboxSubscription {
  return requireOutbox().subscribe(filters, options);
}

/**
 * Publish a shell-signed event using outbox-aware relay fanout.
 *
 * @param template  Unsigned event template
 * @param options   Optional publish options
 * @returns Promise resolving to the outbox publish result
 */
export function outboxPublish(
  template: EventTemplate,
  options?: OutboxPublishOptions,
): Promise<OutboxPublishResult> {
  return requireOutbox().publish(template, options);
}

/**
 * Resolve the relay plan the shell would use for a read/write target.
 *
 * @param target  The read/write target
 * @returns Promise resolving to the relay plan
 */
export function outboxResolveRelays(target: OutboxTarget): Promise<OutboxRelayPlan> {
  return requireOutbox().resolveRelays(target);
}
