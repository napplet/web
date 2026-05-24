// @napplet/nub/connect -- Connect NUB shim (pure meta-tag reader; NO wire protocol).
//
// Reads <meta name="napplet-connect-granted" content="origin1 origin2 ..."> injected
// by the shell at serve time and mounts window.napplet.connect as readonly state.
// Default {granted: false, origins: []} when meta absent or content empty.
//
// Per NUB-CONNECT spec + 137-CONTEXT.md lock: this NUB has NO postMessage wire
// handler. All grant signaling flows via the shell-emitted CSP header + this meta
// tag. The index.ts barrel registers a NOOP dispatcher handler (required so
// dispatch.getRegisteredDomains() lists 'connect') -- not handled here.

import type { NappletConnect } from './types.js';

/** Meta tag name carrying the shell-injected whitespace-separated origin list. */
const GRANTED_META_NAME = 'napplet-connect-granted';

/** Parsed grant state (updated at installConnectShim call time only). */
let currentGranted = false;
let currentOrigins: readonly string[] = Object.freeze([]);

/** Double-install guard. */
let installed = false;

/**
 * Read the shell-injected <meta name="napplet-connect-granted"> content.
 * Silent on any failure (missing tag, missing content) -- state remains default.
 */
function readGrantedMeta(): string | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(`meta[name="${GRANTED_META_NAME}"]`);
  if (!el) return null;
  return el.getAttribute('content');
}

/**
 * Parse a whitespace-separated origin list. Filters empty entries.
 * No re-validation: the shell is authoritative on the origin set; invalid
 * origins will be rejected by the browser's CSP enforcement at fetch time.
 */
function parseOrigins(content: string | null): readonly string[] {
  if (!content) return Object.freeze([]);
  const parts = content.split(/\s+/).filter((s) => s.length > 0);
  return Object.freeze(parts);
}

/**
 * Install the connect shim: read the shell-injected grant meta tag (if any)
 * and mount `window.napplet.connect` as readonly state.
 *
 * Graceful degradation contract: `window.napplet.connect` is ALWAYS populated
 * as `{granted: false, origins: []}` when the meta tag is absent or empty.
 * It is NEVER `undefined` after this function runs.
 *
 * Idempotent: a second call is a no-op and returns a no-op cleanup.
 *
 * @returns cleanup function that removes the window mount and resets state.
 *
 * @example
 * ```ts
 * import { installConnectShim } from '@napplet/nub/connect';
 * const cleanup = installConnectShim();
 * console.log(window.napplet.connect.granted);
 * // later...
 * cleanup();
 * ```
 */
export function installConnectShim(): () => void {
  if (installed) {
    return () => { /* already installed */ };
  }

  // 1. Read meta tag synchronously and populate state.
  const content = readGrantedMeta();
  currentOrigins = parseOrigins(content);
  currentGranted = currentOrigins.length > 0;

  // 2. Mount window.napplet.connect. Use defineProperty with getters so the
  //    two fields track currentGranted/currentOrigins if they are ever
  //    updated (future extension -- v1 is read-once at install).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const napplet = (window as any).napplet ?? ((window as any).napplet = {});
  const api: NappletConnect = Object.defineProperties({} as NappletConnect, {
    granted: {
      get: () => currentGranted,
      enumerable: true,
      configurable: false,
    },
    origins: {
      get: () => currentOrigins,
      enumerable: true,
      configurable: false,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (napplet as any).connect = api;

  installed = true;

  return () => {
    currentGranted = false;
    currentOrigins = Object.freeze([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = (window as any).napplet;
    if (n && n.connect === api) delete n.connect;
    installed = false;
  };
}
