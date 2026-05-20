/**
 * @napplet/nub/connect -- Connect NUB module barrel.
 *
 * User-gated direct network access surface. Napplets declare desired origins
 * in their manifest `connect` tags (via @napplet/vite-plugin); the shell
 * prompts the user at first load, persists the decision keyed on
 * `(dTag, aggregateHash)`, emits a `connect-src`-scoped CSP header when
 * granted, and injects `<meta name="napplet-connect-granted">` into the
 * served HTML. The shim reads that meta tag at install time.
 *
 * NUB-CONNECT has NO wire protocol. The barrel registers a noop handler
 * only to ensure `dispatch.getRegisteredDomains()` includes `'connect'`.
 *
 * @example
 * ```ts
 * import type { NappletConnect } from '@napplet/nub/connect';
 * import { DOMAIN, installConnectShim, connectGranted } from '@napplet/nub/connect';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

// ─── Type Exports ──────────────────────────────────────────────────────────

export type { NappletConnect } from './types.js';

// ─── Function Exports ──────────────────────────────────────────────────────

export { normalizeConnectOrigin } from './types.js';

// ─── Shim Exports ─────────────────────────────────────────────────────────

export { installConnectShim } from './shim.js';

// ─── SDK Exports ──────────────────────────────────────────────────────────

export { connectGranted, connectOrigins } from './sdk.js';

// ─── Domain Registration ───────────────────────────────────────────────────

import { registerNub } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the connect domain with the core dispatch singleton.
 * NUB-CONNECT has no wire protocol -- the handler is an intentional noop.
 * Registration ensures dispatch.getRegisteredDomains() includes 'connect'
 * for shell-side capability introspection.
 */
registerNub(DOMAIN, (_msg) => {
  /* NUB-CONNECT has no wire messages; grant flow is pure meta tag + CSP */
});
