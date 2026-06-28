// @napplet/nap/upload -- Shell-mediated upload shim (upload / status / status push).
// Correlates upload.* request/result envelopes; routes upload.status.changed pushes to listeners.
// The shell owns server selection, auth signing, consent, policy, and the HTTP upload.

import { postToShell } from '../boundary.js';
import type { Subscription } from '@napplet/core';
import type {
  UploadInfo,
  UploadInfoMessage,
  UploadInfoResultMessage,
  UploadRequest,
  UploadResult,
  UploadStatus,
  UploadUploadMessage,
  UploadStatusMessage,
  UploadUploadResultMessage,
  UploadStatusResultMessage,
  UploadStatusChangedMessage,
} from './types.js';

/** Default timeout for the initial upload/status request-response (30s; the upload itself streams via status pushes). */
const REQUEST_TIMEOUT_MS = 30_000;

/** Pending info requests: correlation id -> resolver record. */
const pendingInfo = new Map<string, {
  resolve: (info: UploadInfo) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** Pending upload requests: correlation id -> resolver record. */
const pendingUpload = new Map<string, {
  resolve: (result: UploadResult) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** Pending status requests: correlation id -> resolver record. */
const pendingStatus = new Map<string, {
  resolve: (status: UploadStatus) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** Status-change listeners (each receives every upload.status.changed). */
const statusHandlers = new Set<(status: UploadStatus) => void>();

/** Guard against double-install. */
let installed = false;

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

function handleInfoResult(msg: UploadInfoResultMessage): void {
  const p = pendingInfo.get(msg.id);
  if (!p) return;
  pendingInfo.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.info !== undefined) {
    p.resolve(msg.info);
    return;
  }
  p.reject(new Error(msg.error ?? 'upload info unavailable'));
}

function handleUploadResult(msg: UploadUploadResultMessage): void {
  const p = pendingUpload.get(msg.id);
  if (!p) return;
  pendingUpload.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.result !== undefined) {
    p.resolve(msg.result);
    return;
  }
  p.reject(new Error(msg.error ?? 'upload failed'));
}

function handleStatusResult(msg: UploadStatusResultMessage): void {
  const p = pendingStatus.get(msg.id);
  if (!p) return;
  pendingStatus.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.status !== undefined) {
    p.resolve(msg.status);
    return;
  }
  p.reject(new Error(msg.error ?? 'upload status unavailable'));
}

function handleStatusChanged(msg: UploadStatusChangedMessage): void {
  if (!msg.status) return;
  for (const cb of statusHandlers) cb(msg.status);
}

/**
 * Handle upload.* messages from the shell via the central message listener.
 * Covers upload.upload.result, upload.status.result, and upload.status.changed.
 */
export function handleUploadMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<UploadInfoResultMessage>(msg, 'upload.info.result')) {
    handleInfoResult(msg);
  } else if (isMessageType<UploadUploadResultMessage>(msg, 'upload.upload.result')) {
    handleUploadResult(msg);
  } else if (isMessageType<UploadStatusResultMessage>(msg, 'upload.status.result')) {
    handleStatusResult(msg);
  } else if (isMessageType<UploadStatusChangedMessage>(msg, 'upload.status.changed')) {
    handleStatusChanged(msg);
  }
}

/**
 * Inspect upload rails and coarse policy limits disclosed by the shell.
 *
 * This is advisory introspection only. Callers can upload without calling
 * `info()` first.
 *
 * @returns Promise resolving to the upload info snapshot
 */
export function info(): Promise<UploadInfo> {
  const id = crypto.randomUUID();
  return new Promise<UploadInfo>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingInfo.delete(id)) reject(new Error('upload.info timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingInfo.set(id, { resolve, reject, timeout });

    const msg: UploadInfoMessage = {
      type: 'upload.info',
      id,
    };
    postToShell(msg);
  });
}

/**
 * Upload bytes through the shell. The shell handles consent, server selection,
 * rail authorization signing, and the HTTP upload, then resolves with the initial
 * result. For large/async uploads the result has `status: "uploading"` and
 * progress arrives via {@link onStatus}; subscribe before or right after calling.
 *
 * The promise resolves with the `UploadResult` whenever the shell returns one
 * (including `ok: false` for a created-then-failed/cancelled upload). It rejects
 * only when the shell returns a top-level error (no upload created) or never responds.
 *
 * @param request  The upload request (bytes + intent). `data` is a Blob/ArrayBuffer.
 * @returns Promise resolving to the initial upload result
 *
 * @example
 * ```ts
 * const result = await upload({ rail: 'nip96', data: blob, filename: 'pic.png' });
 * if (result.status === 'complete') attach(result.url, result.nip94);
 * ```
 */
export function upload(request: UploadRequest): Promise<UploadResult> {
  const id = crypto.randomUUID();
  return new Promise<UploadResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingUpload.delete(id)) reject(new Error('upload.upload timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingUpload.set(id, { resolve, reject, timeout });

    const msg: UploadUploadMessage = {
      type: 'upload.upload',
      id,
      request,
    };
    // Structured clone carries Blob/ArrayBuffer across the boundary; no encoding.
    postToShell(msg);
  });
}

/**
 * Get the latest known status for a prior upload, including progress counters.
 *
 * @param uploadId  The shell-generated id from a prior {@link upload}
 * @returns Promise resolving to the latest status
 */
export function status(uploadId: string): Promise<UploadStatus> {
  const id = crypto.randomUUID();
  return new Promise<UploadStatus>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingStatus.delete(id)) reject(new Error('upload.status timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingStatus.set(id, { resolve, reject, timeout });

    const msg: UploadStatusMessage = {
      type: 'upload.status',
      id,
      uploadId,
    };
    postToShell(msg);
  });
}

/**
 * Register for shell-pushed status updates (`upload.status.changed`) -- progress
 * while uploading and the transition to complete/failed. The handler receives
 * every status change; filter on `status.uploadId` to scope to one upload.
 *
 * @param handler  Called with each new UploadStatus
 * @returns A Subscription with `close()` to stop listening
 *
 * @example
 * ```ts
 * const sub = onStatus((s) => {
 *   if (s.uploadId === myId && s.status === 'complete') done(s.url);
 * });
 * ```
 */
export function onStatus(handler: (status: UploadStatus) => void): Subscription {
  statusHandlers.add(handler);
  return {
    close(): void {
      statusHandlers.delete(handler);
    },
  };
}

/**
 * Install the upload shim. Registration-only -- uploads are issued on demand,
 * not at install time.
 *
 * @returns cleanup function that rejects pending requests and clears all state
 */
export function installUploadShim(): () => void {
  if (installed) {
    return () => undefined; // already installed: no-op cleanup
  }
  installed = true;
  return () => {
    for (const p of pendingInfo.values()) clearTimeout(p.timeout);
    for (const p of pendingUpload.values()) clearTimeout(p.timeout);
    for (const p of pendingStatus.values()) clearTimeout(p.timeout);
    pendingInfo.clear();
    pendingUpload.clear();
    pendingStatus.clear();
    statusHandlers.clear();
    installed = false;
  };
}
