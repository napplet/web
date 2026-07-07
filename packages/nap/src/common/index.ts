/**
 * Napplet NAP common -- Common social action NAP module (NAP-COMMON).
 *
 * Shell-mediated public NIP-19 helpers, profile lookup, follows, follow/unfollow,
 * reactions, and reports. The shell owns identity, consent, event construction,
 * signing, publishing, relay access, and NIP-19 handling.
 *
 * Exports typed message definitions for the common domain, shim installer, SDK
 * helpers, and registers the 'common' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import { commonFollows, commonReact } from '@napplet/nap/common';
 *
 * const follows = await commonFollows();
 * await commonReact(noteId, '+');
 * ```
 *
 * @module
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  CommonActionResult,
  CommonDecodeNip19Message,
  CommonDecodeNip19ResultMessage,
  CommonEncodeNip19Message,
  CommonEncodeNip19ResultMessage,
  CommonEventReportTarget,
  CommonFollowMessage,
  CommonFollowResultMessage,
  CommonFollowsMessage,
  CommonFollowsResult,
  CommonFollowsResultMessage,
  CommonGetProfileMessage,
  CommonGetProfileResultMessage,
  CommonInboundMessage,
  CommonMessage,
  CommonNapMessage,
  CommonNip19DecodeResult,
  CommonNip19EncodeInput,
  CommonNip19EncodeResult,
  CommonNip19Type,
  CommonOutboundMessage,
  CommonProfileData,
  CommonProfileResult,
  CommonProfileTarget,
  CommonPubkeyReportTarget,
  CommonReactMessage,
  CommonReactResultMessage,
  CommonReaction,
  CommonReportMessage,
  CommonReportReason,
  CommonReportResultMessage,
  CommonReportTarget,
  CommonUnfollowMessage,
  CommonUnfollowResultMessage,
} from './types.js';

export {
  installCommonShim,
  handleCommonMessage,
  encodeNip19,
  decodeNip19,
  getProfile,
  follows,
  follow,
  unfollow,
  react,
  report,
} from './shim.js';

export {
  commonEncodeNip19,
  commonDecodeNip19,
  commonGetProfile,
  commonFollows,
  commonFollow,
  commonUnfollow,
  commonReact,
  commonReport,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the common domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'common'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
