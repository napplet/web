/**
 * @napplet/sdk -- Access to runtime-exposed experimental (non-NAP) domains.
 *
 * @packageDocumentation
 */

import { isRegistryDomain } from '@napplet/core';

/**
 * Read an experimental domain object the runtime exposed at
 * `window.napplet.<domain>`.
 *
 * Experimental domains are not defined by any NAP: a runtime prototyping a
 * capability exposes one explicitly, and its shape is whatever that runtime's
 * extension provides. Presence is the only availability signal (NIP-5D Runtime
 * Domain Availability), so this returns `undefined` when the domain is absent
 * and the napplet should degrade. Propose the domain on the NAPs track
 * (https://github.com/napplet/naps) before relying on it. Bundled NAP domains
 * have typed SDK wrappers and are refused here.
 *
 * @param domain Bare experimental domain name, e.g. `mesh`.
 * @returns The domain object, or `undefined` when the runtime did not expose it.
 * @throws TypeError when `domain` is a bundled NAP domain.
 * @example
 * ```ts
 * import { experimentalDomain } from '@napplet/sdk';
 *
 * const mesh = experimentalDomain<{ publish(topic: string): void }>('mesh');
 * mesh?.publish('hello');
 * ```
 */
export function experimentalDomain<T = unknown>(domain: string): T | undefined {
  if (isRegistryDomain(domain)) {
    throw new TypeError(`"${domain}" is a NAP domain; use its typed SDK wrapper instead`);
  }
  const napplet = (window as Window & { napplet?: Record<string, unknown> }).napplet;
  if (!napplet || !Object.prototype.hasOwnProperty.call(napplet, domain)) return undefined;
  return napplet[domain] as T;
}
