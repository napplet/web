import type { NostrTag } from './nostr.js';

/** Storage rail for shell-mediated uploads (NAP-UPLOAD). */
export type UploadRail = 'nip96' | 'blossom' | (string & {});

/** Lifecycle state of an upload. */
export type UploadState = 'pending' | 'uploading' | 'complete' | 'failed' | 'cancelled';

/** Runtime-disclosed support for one upload rail. */
export interface UploadRailInfo {
  rail: UploadRail;
  enabled: boolean;
  returns?: string[];
}

/** Advisory upload capability and policy limits disclosed by the runtime. */
export interface UploadInfo {
  rails: UploadRailInfo[];
  maxBytes?: number;
  mimeTypes?: string[];
}

/** A napplet's upload request; `data` crosses the boundary by structured clone. */
export interface UploadRequest {
  rail?: UploadRail;
  data: Blob | ArrayBuffer;
  mimeType?: string;
  filename?: string;
  caption?: string;
  noTransform?: boolean;
  metadata?: Record<string, unknown>;
}

/** The result of an upload. */
export interface UploadResult {
  ok: boolean;
  uploadId: string;
  status: UploadState;
  rail: UploadRail;
  url?: string;
  fallbackUrls?: string[];
  sha256?: string;
  originalSha256?: string;
  size?: number;
  mimeType?: string;
  dimensions?: { width: number; height: number };
  blurhash?: string;
  nip94?: NostrTag[];
  error?: string;
}

/** A status snapshot for an upload, including progress counters. */
export interface UploadStatus extends UploadResult {
  bytesSent?: number;
  bytesTotal?: number;
  updatedAt: number;
}
