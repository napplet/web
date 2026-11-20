/**
 * Browser IIFE entry for `@napplet/shim/prelude.global`.
 *
 * Shells inline this artifact into `srcdoc` and then run
 * `globalThis.NappletShimPrelude.install({ domains })` before any napplet
 * script. NIP-5D §Security limits runtime injection to the `window.napplet`
 * namespace, so the activation global is a configurable property that removes
 * itself on the first `install()` call. Napplet code that runs afterwards
 * cannot find it and cannot re-run the installer with a wider domain list.
 *
 * @module
 */

import type { NappletGlobal } from '@napplet/core';
import { installNappletRuntimePrelude, type NappletRuntimePreludeOptions } from './prelude.js';

const GLOBAL_NAME = 'NappletShimPrelude';

/**
 * Remove the activation global, then install `window.napplet` for the given
 * explicit domain allowlist. The global is removed even if installation throws.
 *
 * @param options Explicit runtime domain allowlist.
 * @returns The installed `window.napplet` namespace.
 * @example
 * ```ts
 * globalThis.NappletShimPrelude.install({ domains: ['identity'] });
 * ```
 */
function install(options: NappletRuntimePreludeOptions): NappletGlobal {
  Reflect.deleteProperty(globalThis, GLOBAL_NAME);
  return installNappletRuntimePrelude(options);
}

Object.defineProperty(globalThis, GLOBAL_NAME, {
  configurable: true,
  enumerable: false,
  writable: false,
  value: Object.freeze({ install }),
});
