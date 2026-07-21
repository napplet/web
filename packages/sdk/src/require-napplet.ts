/**
 * @napplet/sdk -- Shared `window.napplet` accessor for SDK wrapper objects.
 *
 * @packageDocumentation
 */

import type { NappletGlobal } from '@napplet/core';

/**
 * Retrieve the `window.napplet` global, throwing a clear error if it is absent.
 *
 * Every SDK method calls this at invocation time -- not at module load time --
 * so the shim can be imported in any order relative to the SDK.
 */
export function requireNapplet(): NappletGlobal {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet) {
    throw new Error('window.napplet is unavailable -- runtime did not inject the napplet namespace');
  }
  return w.napplet;
}

/**
 * Retrieve a runtime-injected domain from `window.napplet`.
 *
 * Shells inject only the NAP domains available to the current napplet, so SDK
 * wrappers check domain presence at method invocation instead of treating every
 * property as installed.
 */
export function requireDomain<K extends keyof NappletGlobal>(
  domain: K,
): NonNullable<NappletGlobal[K]> {
  const napplet = requireNapplet();
  const value = napplet[domain];
  if (!value) {
    throw new Error(
      `window.napplet.${String(domain)} is unavailable -- runtime did not inject this domain`,
    );
  }
  return value as NonNullable<NappletGlobal[K]>;
}
