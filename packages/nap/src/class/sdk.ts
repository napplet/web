/**
 * @napplet/nap/class -- SDK helper wrapping window.napplet.class.
 *
 * Thin readonly getter for bundler consumers. Unlike other SDK getters in
 * this repo, getClass() does NOT throw on `undefined` -- the undefined state
 * is the legitimate default (before class.assigned arrives; when the shell
 * does not implement nap:class; when the shim is not installed).
 */

import type { NappletGlobal } from '@napplet/core';

/**
 * Return the shell-assigned class number, or `undefined` if not yet assigned.
 *
 * Three distinct `undefined` states that all collapse to the same return:
 * 1. Before the shell has sent `class.assigned` (early bootstrap).
 * 2. When the shell does not implement `nap:class`.
 * 3. When the shim is not installed (e.g., bundler consumers who forgot
 *    to import @napplet/shim).
 *
 * Napplets SHOULD check `shell.supports('nap:class')` before treating
 * `undefined` as a meaningful signal.
 *
 * @returns number | undefined -- the shell-assigned class, or undefined.
 *
 * @example
 * ```ts
 * import { getClass } from '@napplet/nap/class';
 * const cls = getClass();
 * if (cls === undefined) {
 *   // Shell has not assigned (yet, or ever). Feature-detect instead.
 * } else {
 *   console.log(`napplet running as class ${cls}`);
 * }
 * ```
 */
export function getClass(): number | undefined {
  const w = window as Window & { napplet?: NappletGlobal };
  return w.napplet?.class;
}
