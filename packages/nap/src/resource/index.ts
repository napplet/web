/**
 * Napplet NAP resource domain entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/resource -- Resource NAP module.
 *
 * Browser-enforced byte-fetching primitive. Napplets request bytes by URL,
 * shell fetches and returns Blobs. URL space is scheme-pluggable;
 * Canonical NAP-RESOURCE schemes include `data:` (decoded in-shim, no
 * round-trip) plus shell-side `https:`, `blossom:`, `htree:`, and `nostr:`.
 *
 * Exports typed message definitions for the resource domain, shim installer,
 * SDK helpers, and registers the 'resource' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { ResourceBytesMessage, ResourceBytesItem, ResourceErrorCode } from '@napplet/nap/resource';
 * import { DOMAIN, installResourceShim, resourceBytes, resourceBytesMany } from '@napplet/nap/resource';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  ResourceErrorCode,
  ResourceSchemeInfo,
  ResourceInfo,
  ResourceScheme,
  ResourceMessage,
  ResourceInfoMessage,
  ResourceInfoResultMessage,
  ResourceInfoErrorMessage,
  ResourceBytesMessage,
  ResourceBytesManyMessage,
  ResourceBytesResultMessage,
  ResourceBytesErrorMessage,
  ResourceBytesOkItem,
  ResourceBytesErrorItem,
  ResourceBytesItem,
  ResourceBytesManyResultMessage,
  ResourceBytesManyErrorMessage,
  ResourceCancelMessage,
  ResourceSidecarEntry,
  ResourceRequestMessage,
  ResourceResultMessage,
  ResourceNapMessage,
} from './types.js';

export {
  installResourceShim,
  handleResourceMessage,
  info,
  bytes,
  bytesMany,
  bytesAsObjectURL,
  hydrateResourceCache,
} from './shim.js';

export {
  resourceInfo,
  resourceBytes,
  resourceBytesMany,
  resourceBytesAsObjectURL,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the resource domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'resource'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
