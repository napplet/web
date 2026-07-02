/**
 * @napplet/nap/count -- SDK helpers wrapping window.napplet.count.
 */

import type { CountFilter, CountOptions, CountResult, NappletGlobal } from '@napplet/core';

function requireCount(): NonNullable<NappletGlobal['count']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.count) {
    throw new Error('window.napplet.count is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.count;
}

/**
 * Ask the runtime to count events matching NIP-01 filters.
 *
 * @param filters  One NIP-01 filter or a non-empty array of filters
 * @param options  Optional approximation and HyperLogLog hints
 * @returns Promise resolving to the runtime count result
 */
export function countQuery(
  filters: CountFilter | CountFilter[],
  options?: CountOptions,
): Promise<CountResult> {
  return requireCount().query(filters, options);
}
