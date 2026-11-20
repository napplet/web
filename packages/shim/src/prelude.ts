/**
 * Explicit-domain runtime prelude helpers for shell-managed injection.
 *
 * @module
 */

import { isRegistryDomain, normalizeExperimentalDomains, selectNapDomains } from '@napplet/core';
import type { NapDomain, NappletGlobal, NapMaturityPolicy } from '@napplet/core';
import { installNappletGlobal, type NappletRuntimeDomain } from './runtime.js';
import { registerNappletDomainExtension, type NappletDomainExtension } from './experimental.js';

/** Options for installing a constrained `window.napplet` runtime prelude. */
export interface NappletRuntimePreludeOptions {
  /**
   * Explicit domain allowlist the shell exposes to this napplet. Bundled NAP
   * domains are installed directly; experimental names are mounted only when
   * an extension is registered for them.
   */
  domains: readonly NappletRuntimeDomain[];
  /** Optional local maturity policy for bundled NAP domains. Experimental domains bypass it: they are already opt-in. */
  maturity?: NapMaturityPolicy;
  /** Experimental domain extensions to register before installing (ESM hosts only; not serializable). */
  extensions?: readonly NappletDomainExtension[];
}

function normalizePreludeDomains(options: NappletRuntimePreludeOptions): string[] {
  if (!options || !Array.isArray(options.domains)) {
    throw new TypeError('Napplet runtime prelude requires an explicit domains array');
  }

  const names = options.domains.map((domain) => String(domain).trim());
  const registry = names.filter((domain): domain is NapDomain => isRegistryDomain(domain));
  const experimental = normalizeExperimentalDomains(names.filter((domain) => !isRegistryDomain(domain)));
  const selected = options.maturity
    ? [...selectNapDomains({ ...options.maturity, candidates: registry }).domains]
    : registry;
  return [...selected, ...experimental];
}

/**
 * Install callable `window.napplet.<domain>` objects from a host-injected prelude.
 *
 * Unlike the legacy side-effect entry point, this host surface requires an
 * explicit domain allowlist so shell runtimes do not accidentally expose every
 * bundled NAP domain.
 *
 * @param options Explicit runtime domain allowlist.
 * @returns The installed `window.napplet` namespace.
 * @example
 * ```ts
 * import { installNappletRuntimePrelude } from '@napplet/shim/prelude';
 *
 * installNappletRuntimePrelude({ domains: ['identity', 'storage'] });
 * ```
 */
export function installNappletRuntimePrelude(options: NappletRuntimePreludeOptions): NappletGlobal {
  return installNappletGlobal({ domains: normalizePreludeDomains(options), extensions: options?.extensions });
}

/**
 * Render the JavaScript call that activates the browser IIFE prelude artifact.
 *
 * Shells can inline `dist/prelude.global.js` once, then append this call before
 * authored napplet scripts run.
 *
 * @param options Explicit runtime domain allowlist.
 * @returns JavaScript source that invokes the IIFE global installer.
 * @example
 * ```ts
 * const call = renderNappletRuntimePreludeCall({ domains: ['identity'] });
 * ```
 */
export function renderNappletRuntimePreludeCall(options: NappletRuntimePreludeOptions): string {
  return `globalThis.NappletShimPrelude.install(${JSON.stringify({
    domains: normalizePreludeDomains(options),
  })});`;
}

/**
 * Render a `<script>` element body that activates the browser IIFE prelude.
 *
 * This helper intentionally renders the activation call, not the bundled
 * prelude artifact itself. The shell should inline `dist/prelude.global.js`
 * before this activation script when constructing `srcdoc`.
 *
 * @param options Explicit runtime domain allowlist.
 * @returns HTML script tag that invokes the IIFE global installer.
 * @example
 * ```ts
 * const script = renderNappletRuntimePreludeScript({ domains: ['identity'] });
 * ```
 */
export function renderNappletRuntimePreludeScript(options: NappletRuntimePreludeOptions): string {
  return `<script>${renderNappletRuntimePreludeCall(options)}</script>`;
}

/** Alias for {@link installNappletRuntimePrelude}. */
export const install: typeof installNappletRuntimePrelude = installNappletRuntimePrelude;

/**
 * Register an experimental domain implementation before the prelude installs.
 *
 * Browser IIFE hosts call `globalThis.NappletShimPrelude.registerExtension(...)`
 * from a script placed after the prelude artifact and before the activation call.
 *
 * @param extension Domain name and API factory.
 * @example
 * ```ts
 * registerNappletRuntimeExtension({ domain: 'mesh', create: (channel) => ({ ping: () => channel.send({ type: 'mesh.ping' }) }) });
 * installNappletRuntimePrelude({ domains: ['relay', 'mesh'] });
 * ```
 */
export function registerNappletRuntimeExtension(extension: NappletDomainExtension): void {
  registerNappletDomainExtension(extension);
}

/** Alias for {@link registerNappletRuntimeExtension}. */
export const registerExtension: typeof registerNappletRuntimeExtension = registerNappletRuntimeExtension;
export type { NapDomain, NappletGlobal, NappletDomainExtension, NappletRuntimeDomain };
export type { ExperimentalDomainChannel } from './experimental.js';
