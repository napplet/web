/**
 * @napplet/nub/media -- Media NUB module.
 *
 * Exports typed message definitions for the media domain, shim installer,
 * SDK helpers, and registers the 'media' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { MediaSessionCreateMessage, MediaNubMessage, MediaMetadata } from '@napplet/nub/media';
 * import { DOMAIN, installMediaShim, mediaCreateSession } from '@napplet/nub/media';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

// ─── Type Exports ──────────────────────────────────────────────────────────

export type {
  MediaMetadata,
  MediaArtwork,
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
  MediaNubMessage,
} from './types.js';

// ─── Shim Exports ─────────────────────────────────────────────────────────

export {
  installMediaShim,
  handleMediaMessage,
  createSession,
  updateSession,
  destroySession,
  reportState,
  reportCapabilities,
  onCommand,
  onControls,
} from './shim.js';

// ─── SDK Exports ──────────────────────────────────────────────────────────

export {
  mediaCreateSession,
  mediaUpdateSession,
  mediaDestroySession,
  mediaReportState,
  mediaReportCapabilities,
  mediaOnCommand,
  mediaOnControls,
} from './sdk.js';

// ─── Domain Registration ───────────────────────────────────────────────────

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
