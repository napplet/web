import { NAP_DOMAINS } from '@napplet/core';
import type { NapDomain, NappletGlobal } from '@napplet/core';
import { installNappletGlobal } from './runtime.js';

export interface NappletRuntimePreludeOptions {
  /** Explicit NAP domain allowlist the shell exposes to this napplet. */
  domains: readonly NapDomain[];
}

const KNOWN_DOMAINS = new Set<string>(NAP_DOMAINS);

function normalizePreludeDomains(options: NappletRuntimePreludeOptions): NapDomain[] {
  if (!options || !Array.isArray(options.domains)) {
    throw new TypeError('Napplet runtime prelude requires an explicit domains array');
  }

  return options.domains.filter((domain): domain is NapDomain => KNOWN_DOMAINS.has(domain));
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
  return installNappletGlobal({ domains: normalizePreludeDomains(options) });
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

export const install = installNappletRuntimePrelude;
export type { NapDomain, NappletGlobal };
