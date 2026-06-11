/**
 * @napplet/nub/media -- Media NAP module.
 *
 * Exports typed message definitions for the media domain, shim installer,
 * SDK helpers, and registers the 'media' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { MediaSessionCreateMessage, MediaNapMessage, MediaMetadata } from '@napplet/nub/media';
 * import { DOMAIN, installMediaShim, mediaCreateSession } from '@napplet/nub/media';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  MediaMetadata,
  MediaArtwork,
  MediaPlaybackOwner,
  MediaSourceRef,
  MediaSessionCreate,
  MediaSessionResult,
  MediaState,
  MediaAction,
  MediaMessage,
  MediaSessionCreateMessage,
  MediaSessionCreateResultMessage,
  MediaSessionUpdateMessage,
  MediaSessionDestroyMessage,
  MediaStateMessage,
  MediaCapabilitiesMessage,
  MediaCommandMessage,
  MediaControlsMessage,
  MediaRequestMessage,
  MediaResultMessage,
  MediaNapMessage,
  MediaNubMessage,
} from './types.js';

export {
  installMediaShim,
  handleMediaMessage,
  createSession,
  updateSession,
  destroySession,
  reportState,
  reportCapabilities,
  sendCommand,
  onCommand,
  onState,
  onCapabilities,
  onControls,
} from './shim.js';

export {
  mediaCreateSession,
  mediaUpdateSession,
  mediaDestroySession,
  mediaReportState,
  mediaReportCapabilities,
  mediaSendCommand,
  mediaOnCommand,
  mediaOnState,
  mediaOnCapabilities,
  mediaOnControls,
} from './sdk.js';

import { registerNub } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the media domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'media'.
 */
registerNub(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
