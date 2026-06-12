/**
 * @napplet/nap/identity -- Identity NAP module.
 *
 * Exports typed message definitions for the identity domain, shim installer,
 * SDK helpers, and registers the 'identity' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { IdentityGetPublicKeyMessage, IdentityNapMessage } from '@napplet/nap/identity';
 * import { DOMAIN, installIdentityShim, identityGetPublicKey } from '@napplet/nap/identity';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  ProfileData,
  ZapReceipt,
  Badge,
  RelayPermission,
  IdentityMessage,
  IdentityGetPublicKeyMessage,
  IdentityGetRelaysMessage,
  IdentityGetProfileMessage,
  IdentityGetFollowsMessage,
  IdentityGetListMessage,
  IdentityGetZapsMessage,
  IdentityGetMutesMessage,
  IdentityGetBlockedMessage,
  IdentityGetBadgesMessage,
  IdentityGetPublicKeyResultMessage,
  IdentityGetRelaysResultMessage,
  IdentityGetProfileResultMessage,
  IdentityGetFollowsResultMessage,
  IdentityGetListResultMessage,
  IdentityGetZapsResultMessage,
  IdentityGetMutesResultMessage,
  IdentityGetBlockedResultMessage,
  IdentityGetBadgesResultMessage,
  IdentityChangedMessage,
  IdentityRequestMessage,
  IdentityResultMessage,
  IdentityNapMessage,
} from './types.js';

export {
  installIdentityShim,
  handleIdentityMessage,
  getPublicKey,
  onChanged,
  getRelays,
  getProfile,
  getFollows,
  getList,
  getZaps,
  getMutes,
  getBlocked,
  getBadges,
} from './shim.js';

export {
  identityGetPublicKey,
  identityOnChanged,
  identityGetRelays,
  identityGetProfile,
  identityGetFollows,
  identityGetList,
  identityGetZaps,
  identityGetMutes,
  identityGetBlocked,
  identityGetBadges,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the identity domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'identity'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
