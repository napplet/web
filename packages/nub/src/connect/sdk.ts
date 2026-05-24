/**
 * @napplet/nub/connect -- SDK helpers wrapping window.napplet.connect.
 *
 * Thin readonly getters for bundler consumers who prefer named imports over
 * reaching into window.napplet.connect directly. The shim must be imported
 * somewhere to install the global -- these helpers throw if it is not.
 */

import type { NappletGlobal } from '@napplet/core';

function requireConnect(): NappletGlobal['connect'] {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.connect) {
    throw new Error('window.napplet.connect not installed -- import @napplet/shim first');
  }
  return w.napplet.connect;
}

/**
 * Return the current connect-grant state.
 *
 * True when the shell injected a `napplet-connect-granted` meta tag with at
 * least one origin; false when the meta is absent, empty, or the shell does
 * not implement `nub:connect`.
 *
 * @returns boolean grant state
 *
 * @example
 * ```ts
 * import { connectGranted } from '@napplet/nub/connect';
 * if (connectGranted()) {
 *   // CSP permits connect-src for declared origins
 *   await fetch('https://api.example.com/me');
 * }
 * ```
 */
export function connectGranted(): boolean {
  return requireConnect().granted;
}

/**
 * Return the readonly list of granted origins.
 *
 * Empty when `granted` is false. Origins are already normalized by the
 * vite-plugin at build time + the shell consent machinery.
 *
 * @returns readonly string[] of granted origins
 *
 * @example
 * ```ts
 * import { connectOrigins } from '@napplet/nub/connect';
 * for (const origin of connectOrigins()) {
 *   console.log('CSP allows', origin);
 * }
 * ```
 */
export function connectOrigins(): readonly string[] {
  return requireConnect().origins;
}
