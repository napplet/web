/**
 * Napplet NAP upload sdk entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/upload -- SDK helpers wrapping window.napplet.upload.
 *
 * These convenience functions delegate to `window.napplet.upload.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal, Subscription } from '@napplet/core';
import type {
  UploadInfo,
  UploadRequest,
  UploadResult,
  UploadStatus,
} from './types.js';

function requireUpload(): NonNullable<NappletGlobal['upload']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.upload) {
    throw new Error('window.napplet.upload is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.upload;
}

/**
 * Inspect upload rails and coarse runtime policy limits.
 *
 * @returns Promise resolving to advisory upload info.
 */
export function uploadInfo(): Promise<UploadInfo> {
  return requireUpload().info();
}

/** Alias for {@link uploadInfo} on the SDK subpath. */
export const info = uploadInfo;

/**
 * Upload bytes through the shell's storage pipeline.
 *
 * @param request  The upload request (bytes + intent)
 * @returns Promise resolving to the initial upload result
 *
 * @example
 * ```ts
 * import { uploadFile } from '@napplet/nap/upload';
 *
 * const result = await uploadFile({ data: blob, filename: 'pic.png' });
 * ```
 */
export function uploadFile(request: UploadRequest): Promise<UploadResult> {
  return requireUpload().upload(request);
}

/** Alias for {@link uploadFile} on the SDK subpath. */
export const upload = uploadFile;

/**
 * Get the latest known status for a prior upload.
 *
 * @param uploadId  The shell-generated upload id
 * @returns Promise resolving to the latest status
 */
export function uploadStatus(uploadId: string): Promise<UploadStatus> {
  return requireUpload().status(uploadId);
}

/** Alias for {@link uploadStatus} on the SDK subpath. */
export const status = uploadStatus;

/**
 * Register for shell-pushed upload status updates.
 *
 * @param handler  Called with each new UploadStatus
 * @returns A Subscription with `close()` to stop listening
 */
export function uploadOnStatus(handler: (status: UploadStatus) => void): Subscription {
  return requireUpload().onStatus(handler);
}

/** Alias for {@link uploadOnStatus} on the SDK subpath. */
export const onStatus = uploadOnStatus;
