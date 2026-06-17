/**
 * @napplet/nap/shell -- SDK helpers wrapping window.napplet.shell.
 *
 * These convenience functions delegate to `window.napplet.shell.*` at call time.
 * The shim (@napplet/shim) must be imported somewhere to install the global and
 * complete the NAP-SHELL handshake.
 */

import type { NappletGlobal, ShellEnvironment, Subscription } from '@napplet/core';

function requireShell(): NappletGlobal['shell'] {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.shell) {
    throw new Error('window.napplet.shell not installed -- import @napplet/shim first');
  }
  return w.napplet.shell;
}

/**
 * Synchronously query whether the runtime offers a domain (optionally narrowed
 * to a numbered protocol). Answers `false` before `shell.init` and for unknowns.
 *
 * @example
 * ```ts
 * import { shellSupports } from '@napplet/nap/shell';
 * if (shellSupports('relay')) { ... }
 * if (shellSupports('inc', 'NAP-2')) { ... }
 * ```
 */
export function shellSupports(domain: string, protocol?: string): boolean {
  return requireShell().supports(domain, protocol);
}

/**
 * The named services the runtime exposes for this napplet (`[]` before init).
 *
 * @example
 * ```ts
 * import { shellServices } from '@napplet/nap/shell';
 * const services = shellServices();
 * ```
 */
export function shellServices(): readonly string[] {
  return requireShell().services;
}

/**
 * The opaque class assigned to this napplet, or `null` when none is assigned.
 *
 * @example
 * ```ts
 * import { shellClass } from '@napplet/nap/shell';
 * const cls = shellClass();
 * ```
 */
export function shellClass(): number | null {
  return requireShell().class;
}

/**
 * Resolve once the NAP-SHELL environment has been delivered (immediately if
 * already delivered).
 *
 * @example
 * ```ts
 * import { shellReady } from '@napplet/nap/shell';
 * const env = await shellReady();
 * ```
 */
export function shellReady(): Promise<ShellEnvironment> {
  return requireShell().ready();
}

/**
 * Register a one-shot callback fired when the environment is delivered (or
 * immediately if already delivered).
 *
 * @returns Subscription with close() to detach the handler
 *
 * @example
 * ```ts
 * import { shellOnReady } from '@napplet/nap/shell';
 * const sub = shellOnReady((env) => start(env));
 * ```
 */
export function shellOnReady(handler: (env: ShellEnvironment) => void): Subscription {
  return requireShell().onReady(handler);
}
