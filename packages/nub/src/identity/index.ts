/**
 * @napplet/nub/identity -- Identity NUB module.
 *
 * Exports typed message definitions for the identity domain, shim installer,
 * SDK helpers, and registers the 'identity' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { IdentityGetPublicKeyMessage, IdentityNubMessage } from '@napplet/nub/identity';
 * import { DOMAIN, installIdentityShim, identityGetPublicKey } from '@napplet/nub/identity';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

// ─── Type Exports ──────────────────────────────────────────────────────────

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
  IdentityRequestMessage,
  IdentityResultMessage,
  IdentityNubMessage,
  IdentityDecryptMessage,
  IdentityDecryptResultMessage,
  IdentityDecryptErrorMessage,
  IdentityDecryptErrorCode,
} from './types.js';

// ─── Cross-Package Type Re-Exports (from @napplet/core) ────────────────────

export type {
  Rumor,
  UnsignedEvent,
} from '@napplet/core';

// ─── Shim Exports ─────────────────────────────────────────────────────────

export {
  installIdentityShim,
  handleIdentityMessage,
  getPublicKey,
  getRelays,
  getProfile,
  getFollows,
  getList,
  getZaps,
  getMutes,
  getBlocked,
  getBadges,
  decrypt,
} from './shim.js';

// ─── SDK Exports ──────────────────────────────────────────────────────────

export {
  identityGetPublicKey,
  identityGetRelays,
  identityGetProfile,
  identityGetFollows,
  identityGetList,
  identityGetZaps,
  identityGetMutes,
  identityGetBlocked,
  identityGetBadges,
  identityDecrypt,
} from './sdk.js';

// ─── Domain Registration ───────────────────────────────────────────────────

import { registerNub } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the identity domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'identity'.
 */
registerNub(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
