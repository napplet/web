/**
 * Napplet NAP identity types entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/identity -- Read-only user identity query types
 * for the JSON envelope wire protocol.
 *
 * This module is a barrel: value shapes live in `./value-types.js` and the wire
 * message types live in `./message-types.js`. It re-exports both groups (and the
 * `DOMAIN` constant) so `@napplet/nap/identity/types` and `@napplet/nap/identity`
 * keep exporting the exact same names.
 *
 * All queries are strictly read-only -- no signing, encryption, or decryption.
 */

/** The NAP domain name for identity messages. */
export const DOMAIN = 'identity' as const;

export type { ProfileData, ZapReceipt, Badge, RelayPermission } from './value-types.js';

export type {
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
  IdentityChangedMessage,
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
  IdentityNapMessage,
} from './message-types.js';
