/**
 * @napplet/nap/system -- Read-only runtime system information module (NAP-SYSTEM).
 *
 * Exports typed message definitions for the system domain, shim installer, SDK
 * helpers, and registers the `system` domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import { systemNaps, systemEventCache } from '@napplet/nap/system';
 *
 * const naps = await systemNaps();
 * const cache = await systemEventCache();
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  SystemHealth,
  SystemNapStatus,
  SystemServiceStatus,
  SystemRelayStatus,
  SystemStorageStatus,
  SystemMediaStatus,
  SystemScopeSummary,
  SystemScopeStatus,
  SystemAccessor,
  SystemMessage,
  SystemNapsMessage,
  SystemServicesMessage,
  SystemRelaysMessage,
  SystemEventCacheMessage,
  SystemLocalStorageMessage,
  SystemIndexedDbMessage,
  SystemMediaMessage,
  SystemNappletStorageMessage,
  SystemScopesMessage,
  SystemRequestMessage,
  SystemScopeMessage,
  SystemNapsResultMessage,
  SystemServicesResultMessage,
  SystemRelaysResultMessage,
  SystemEventCacheResultMessage,
  SystemLocalStorageResultMessage,
  SystemIndexedDbResultMessage,
  SystemNappletStorageResultMessage,
  SystemStorageResultMessage,
  SystemMediaResultMessage,
  SystemScopesResultMessage,
  SystemScopeResultMessage,
  SystemOutboundMessage,
  SystemInboundMessage,
  SystemNapMessage,
} from './types.js';

export {
  installSystemShim,
  handleSystemMessage,
  naps,
  services,
  relays,
  eventCache,
  localStorage,
  indexedDb,
  media,
  nappletStorage,
  scopes,
  scope,
} from './shim.js';

export {
  systemNaps,
  systemServices,
  systemRelays,
  systemEventCache,
  systemLocalStorage,
  systemIndexedDb,
  systemMedia,
  systemNappletStorage,
  systemScopes,
  systemScope,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the system domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
