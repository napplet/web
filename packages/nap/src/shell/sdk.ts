/** SDK helpers for the optional injected shell environment. */
import type { NappletGlobal, ShellEnvironment, Subscription } from '@napplet/core';

function requireShell(): NonNullable<NappletGlobal['shell']> {
  const shell = (window as Window & { napplet?: NappletGlobal }).napplet?.shell;
  if (!shell) throw new Error('window.napplet.shell is unavailable');
  return shell;
}

/**
 * Query exposed domain presence through the optional shell convenience.
 * @param domain Bare domain name
 * @returns Domain availability
 * @example
 * shellSupports('identity');
 */
export function shellSupports(domain: string): boolean { return requireShell().supports(domain); }

/**
 * Await optional shell environment information.
 * @returns Retained environment
 * @example
 * const environment = await shellReady();
 */
export function shellReady(): Promise<ShellEnvironment> { return requireShell().ready(); }

/**
 * Register a one-shot environment callback.
 * @param handler Callback for the retained environment
 * @returns Subscription handle
 * @example
 * shellOnReady(({ services }) => showServices(services));
 */
export function shellOnReady(handler: (environment: ShellEnvironment) => void): Subscription {
  return requireShell().onReady(handler);
}
