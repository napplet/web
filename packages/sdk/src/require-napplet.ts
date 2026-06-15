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
    throw new Error('window.napplet not installed -- import @napplet/shim first');
  }
  return w.napplet;
}
