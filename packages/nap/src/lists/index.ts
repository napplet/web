/**
 * Napplet NAP lists -- Runtime-mediated NIP-51 list mutation NAP module.
 *
 * NAP-LISTS lets a sandboxed napplet ask the runtime to add or remove items
 * from supported NIP-51 lists. The runtime owns lookup, merge, encryption,
 * signing, and publishing so napplets do not handle replaceable/addressable
 * list event mutation directly.
 *
 * @example
 * ```ts
 * import { listsAdd } from '@napplet/nap/lists';
 *
 * await listsAdd({ type: 'mute-list' }, [
 *   { itemType: 'pubkey', value: 'abc123...' },
 * ]);
 * ```
 *
 * @module
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  ListErrorCode,
  ListItem,
  ListItemType,
  ListItemVisibility,
  ListMutationResult,
  ListOptions,
  ListRef,
  ListSupport,
  ListsMessage,
  ListsSupportedMessage,
  ListsSupportedResultMessage,
  ListsAddMessage,
  ListsAddResultMessage,
  ListsRemoveMessage,
  ListsRemoveResultMessage,
  ListsOutboundMessage,
  ListsInboundMessage,
  ListsNapMessage,
} from './types.js';

export {
  installListsShim,
  handleListsMessage,
  supported,
  add,
  remove,
} from './shim.js';

export {
  listsSupported,
  listsAdd,
  listsRemove,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the lists domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
