/**
 * @napplet/nap/upload -- Shell-mediated file/blob upload message types for the JSON envelope wire protocol.
 *
 * NAP-UPLOAD lets a napplet hand the shell raw bytes plus a description of the
 * intended upload; the shell selects a storage server, constructs and signs the
 * rail's authorization (NIP-98 for NIP-96, kind 24242 for Blossom), performs the
 * HTTP upload, and returns a stable URL plus NIP-94 integrity metadata. The shell
 * is the policy and consent boundary; napplets never receive signing keys, server
 * credentials, or direct network access.
 *
 * Defines the message types exchanged between napplet and shell:
 * - Napplet -> Shell: upload, status
 * - Shell -> Napplet: upload.result, status.result, status.changed
 *
 * All types form a discriminated union on the `type` field.
 */

import type {
  NappletMessage,
  NostrTag,
  UploadRail,
  UploadState,
} from '@napplet/core';

/** The NAP domain name for upload messages. */
export const DOMAIN = 'upload' as const;

/** A single Nostr tag (NIP-94 / imeta entries are arrays of strings). */
export type { NostrTag };

/**
 * Storage rail. `nip96` (NIP-96 HTTP file storage) and `blossom` (Blossom blob
 * storage) are the first concrete backends; the open string keeps the napplet
 * API stable as shells add rails.
 */
export type { UploadRail };

/** Lifecycle state of an upload. */
export type { UploadState };

/** Pixel dimensions of an uploaded image/video. */
export interface UploadDimensions {
  width: number;
  height: number;
}

/**
 * A napplet's upload request. `data` crosses the postMessage boundary by
 * structured clone -- shells MUST NOT require base64 encoding.
 */
export interface UploadRequest {
  /** Storage rail; omit to let the shell pick a configured default. */
  rail?: UploadRail;
  /** The bytes to upload. */
  data: Blob | ArrayBuffer;
  /** MIME type; inferred from `data` when omitted. */
  mimeType?: string;
  /** Suggested filename. */
  filename?: string;
  /** Alt text / description for the file event. */
  caption?: string;
  /** Request the server not re-encode the file (NIP-96 `no_transform`). */
  noTransform?: boolean;
  /** Rail-specific or shell-specific extra metadata. */
  metadata?: Record<string, unknown>;
}

/** The result of an upload. */
export interface UploadResult {
  /** Whether the upload succeeded (or is progressing) vs failed/cancelled. */
  ok: boolean;
  /** Shell-generated id, scoped to the requesting napplet. */
  uploadId: string;
  /** Current lifecycle state. */
  status: UploadState;
  /** The rail the shell used. */
  rail: UploadRail;
  /** Primary download URL. */
  url?: string;
  /** Mirrors / alternative server URLs. */
  fallbackUrls?: string[];
  /** Hash of the stored blob (NIP-94 `x`). */
  sha256?: string;
  /** Hash before server transforms (NIP-94 `ox`). */
  originalSha256?: string;
  /** Size in bytes. */
  size?: number;
  /** Stored MIME type. */
  mimeType?: string;
  /** Image/video dimensions when known. */
  dimensions?: UploadDimensions;
  /** Blurhash placeholder when known. */
  blurhash?: string;
  /** Ready-to-attach NIP-94 / imeta tags. */
  nip94?: NostrTag[];
  /** Error reason when the upload failed or was cancelled. */
  error?: string;
}

/** A status snapshot for an upload, including progress counters. */
export interface UploadStatus extends UploadResult {
  /** Bytes sent so far (while uploading). */
  bytesSent?: number;
  /** Total bytes to send. */
  bytesTotal?: number;
  /** Unix ms timestamp of this status. */
  updatedAt: number;
}

/**
 * Base interface for all upload NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface UploadMessage extends NappletMessage {
  /** Message type in "upload.<action>" format. */
  type: `upload.${string}`;
}

/**
 * Upload the supplied bytes. The shell presents consent UI, selects a backend,
 * signs the rail authorization, performs the upload, and replies with
 * `upload.upload.result`. Large/async uploads stream progress via
 * `upload.status.changed`.
 *
 * @example
 * ```ts
 * const msg: UploadUploadMessage = {
 *   type: 'upload.upload',
 *   id: crypto.randomUUID(),
 *   request: { rail: 'nip96', data: blob, filename: 'diagram.png', mimeType: 'image/png' },
 * };
 * ```
 */
export interface UploadUploadMessage extends UploadMessage {
  type: 'upload.upload';
  /** Correlation ID for this request. */
  id: string;
  /** The upload request (bytes + intent). */
  request: UploadRequest;
}

/** Result of an `upload.upload` request. */
export interface UploadUploadResultMessage extends UploadMessage {
  type: 'upload.upload.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The initial upload result. */
  result?: UploadResult;
  /** Top-level error when no upload could be created. */
  error?: string;
}

/** Query the latest known status for a prior upload. */
export interface UploadStatusMessage extends UploadMessage {
  type: 'upload.status';
  /** Correlation ID for this request. */
  id: string;
  /** The upload to query. */
  uploadId: string;
}

/** Result of an `upload.status` request. */
export interface UploadStatusResultMessage extends UploadMessage {
  type: 'upload.status.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The latest status. */
  status?: UploadStatus;
  /** Error when the status could not be resolved. */
  error?: string;
}

/**
 * Shell-pushed status update (progress, or transition to complete/failed).
 * Carries no correlation `id`; delivered to all `onStatus` listeners.
 */
export interface UploadStatusChangedMessage extends UploadMessage {
  type: 'upload.status.changed';
  /** The new status. */
  status: UploadStatus;
}

/** Napplet -> Shell upload messages. */
export type UploadOutboundMessage =
  | UploadUploadMessage
  | UploadStatusMessage;

/** Shell -> Napplet upload messages. */
export type UploadInboundMessage =
  | UploadUploadResultMessage
  | UploadStatusResultMessage
  | UploadStatusChangedMessage;

/** All upload NAP message types (discriminated union on `type` field). */
export type UploadNapMessage = UploadOutboundMessage | UploadInboundMessage;
