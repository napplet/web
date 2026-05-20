/**
 * @napplet/nub/resource -- Resource NUB module.
 *
 * Browser-enforced byte-fetching primitive. Napplets request bytes by URL,
 * shell fetches and returns a Blob. URL space is scheme-pluggable;
 * v0.28.0 ships `data:` (decoded in-shim, no round-trip) plus shell-side
 * `https:`, `blossom:`, `nostr:` (specced in NUB-RESOURCE Phase 132).
 *
 * Exports typed message definitions for the resource domain, shim installer,
 * SDK helpers, and registers the 'resource' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { ResourceBytesMessage, ResourceErrorCode } from '@napplet/nub/resource';
 * import { DOMAIN, installResourceShim, resourceBytes } from '@napplet/nub/resource';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

// ─── Type Exports ──────────────────────────────────────────────────────────

export type {
  ResourceErrorCode,
  ResourceScheme,
  ResourceMessage,
  ResourceBytesMessage,
  ResourceBytesResultMessage,
  ResourceBytesErrorMessage,
  ResourceCancelMessage,
  ResourceSidecarEntry,
  ResourceRequestMessage,
  ResourceResultMessage,
  ResourceNubMessage,
} from './types.js';

// ─── Shim Exports ─────────────────────────────────────────────────────────

export {
  installResourceShim,
  handleResourceMessage,
  bytes,
  bytesAsObjectURL,
  hydrateResourceCache,
} from './shim.js';

// ─── SDK Exports ──────────────────────────────────────────────────────────

export {
  resourceBytes,
  resourceBytesAsObjectURL,
} from './sdk.js';

// ─── Domain Registration ───────────────────────────────────────────────────

import { registerNub } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the resource domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'resource'.
 */
registerNub(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
