/**
 * Napplet NAP storage -- Storage NAP module.
 *
 * Exports typed message definitions for the storage domain, shim installer,
 * SDK helpers, and registers the 'storage' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { StorageGetMessage, StorageNapMessage } from '@napplet/nap/storage';
 * import { DOMAIN, installStorageShim, storageGetItem } from '@napplet/nap/storage';
 * ```
 *
 * @module
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  StorageScope,
  StorageMessage,
  StorageGetMessage,
  StorageSetMessage,
  StorageRemoveMessage,
  StorageKeysMessage,
  StorageGetResultMessage,
  StorageSetResultMessage,
  StorageRemoveResultMessage,
  StorageKeysResultMessage,
  StorageRequestMessage,
  StorageResultMessage,
  StorageNapMessage,
} from './types.js';

export { installStorageShim, nappletStorage } from './shim.js';

export {
  storageGetItem,
  storageSetItem,
  storageRemoveItem,
  storageKeys,
  storageInstanceGetItem,
  storageInstanceSetItem,
  storageInstanceRemoveItem,
  storageInstanceKeys,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the storage domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'storage'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
