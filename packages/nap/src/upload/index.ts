/**
 * @napplet/nap/upload -- Shell-mediated file/blob upload NAP module (NAP-UPLOAD).
 *
 * A napplet hands the shell raw bytes plus upload intent; the shell selects a
 * storage server, signs the rail authorization (NIP-98 for NIP-96, kind 24242
 * for Blossom), performs the HTTP upload, and returns a stable URL plus NIP-94
 * integrity metadata. The shell is the policy and consent boundary; napplets
 * never receive signing keys, server credentials, or direct network access.
 *
 * Exports typed message definitions for the upload domain, shim installer,
 * SDK helpers, and registers the 'upload' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { UploadRequest, UploadResult } from '@napplet/nap/upload';
 * import { DOMAIN, installUploadShim, uploadFile } from '@napplet/nap/upload';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  NostrTag,
  UploadRail,
  UploadState,
  UploadRailInfo,
  UploadInfo,
  UploadDimensions,
  UploadRequest,
  UploadResult,
  UploadStatus,
  UploadMessage,
  UploadInfoMessage,
  UploadInfoResultMessage,
  UploadUploadMessage,
  UploadUploadResultMessage,
  UploadStatusMessage,
  UploadStatusResultMessage,
  UploadStatusChangedMessage,
  UploadOutboundMessage,
  UploadInboundMessage,
  UploadNapMessage,
} from './types.js';

export {
  installUploadShim,
  handleUploadMessage,
  info,
  upload,
  status,
  onStatus,
} from './shim.js';

export {
  uploadInfo,
  uploadFile,
  uploadStatus,
  uploadOnStatus,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the upload domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'upload'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
